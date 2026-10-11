// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title APayRouterV2
 * @notice Enterprise High-Throughput Settlement Router for AI Agent Micropayments.
 * @dev Supports:
 *   1. On-Chain EIP-712 Typed Signature Verification.
 *   2. Nonce Replay Registry (Cryptographic anti-replay).
 *   3. Cumulative State Channel Single-Transaction Settlement.
 *   4. Atomic Multi-Payment Batch Settlements.
 *   5. Merkle Root Epoch Settlement with on-chain claim verification.
 *   6. Dynamic Tiered Fee Discounts based on $APAY token holding.
 */
interface IERC20Minimal {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract APayRouterV2 {
    address public immutable owner;
    address public treasury;
    address public apayToken;
    uint256 public feeBps; // 100 bps = 1.0%
    uint256 public constant MAX_BPS = 10000;

    // EIP-712 Constants
    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public constant PAYMENT_TYPEHASH =
        keccak256("PaymentAuthorization(address payer,address receiver,uint256 amount,string nonce)");
    bytes32 public constant CHANNEL_TYPEHASH =
        keccak256("ChannelVoucher(bytes32 channelId,address payer,address receiver,uint256 cumulativeAmount,uint256 sequence)");

    // Cryptographic Anti-Replay Nonce Registry: hash(payer, nonce) => bool
    mapping(bytes32 => bool) public consumedNonces;

    // Channel Highest Settled Sequence: channelId => highestSettledSequence
    mapping(bytes32 => uint256) public channelSettledSequence;

    // Merkle Epoch Registry: epochId => merkleRoot
    mapping(string => bytes32) public epochMerkleRoots;

    // Consumed Merkle Claim Leaf Registry: leafHash => bool (Anti-double-spend)
    mapping(bytes32 => bool) public consumedMerkleLeaves;

    event PaymentSettled(
        address indexed payer,
        address indexed receiver,
        address indexed token,
        uint256 totalAmount,
        uint256 feeAmount,
        string nonce
    );

    event ChannelSettled(
        bytes32 indexed channelId,
        address indexed payer,
        address indexed receiver,
        address token,
        uint256 cumulativeAmount,
        uint256 sequence
    );

    event EpochMerkleCommitted(string indexed epochId, bytes32 indexed merkleRoot, uint256 totalClaims);

    event MerkleClaimSettled(
        string indexed epochId,
        address indexed payer,
        address indexed receiver,
        address token,
        uint256 totalAmount,
        uint256 feeAmount,
        bytes32 leaf
    );

    event TreasuryUpdated(address indexed newTreasury);
    event FeeUpdated(uint256 newFeeBps);
    event APAYTokenUpdated(address indexed newAPAYToken);

    error Unauthorized();
    error InvalidFee();
    error TransferFailed();
    error ArrayLengthMismatch();
    error NonceAlreadyConsumed();
    error InvalidSignature();
    error StaleChannelSequence();
    error InvalidParameters();
    error EpochNotCommitted();
    error ClaimAlreadyConsumed();
    error InvalidMerkleProof();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address _treasury, uint256 _initialFeeBps, address _apayToken) {
        if (_initialFeeBps > 500) revert InvalidFee(); // Max 5% safety cap
        owner = msg.sender;
        treasury = _treasury;
        feeBps = _initialFeeBps; // e.g. 100 = 1.0%
        apayToken = _apayToken;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("APay Protocol")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    /**
     * @notice Calculate dynamic protocol fee in basis points based on $APAY holding tiers.
     * @dev Tiers per protocol tokenomics:
     *   - Payer is owner or treasury: 0 bps (100% exempt)
     *   - Holding >= 200,000 $APAY: 80% discount (0.20% net fee at 100 bps)
     *   - Holding >= 50,000 $APAY:  50% discount (0.50% net fee at 100 bps)
     *   - Holding >= 10,000 $APAY:  25% discount (0.75% net fee at 100 bps)
     *   - Default: standard feeBps (1.00% at 100 bps)
     * @param payer Address of the payer/agent.
     * @return Effective fee in basis points.
     */
    function getFeeBpsForPayer(address payer) public view returns (uint256) {
        if (payer == owner || payer == treasury) {
            return 0;
        }
        if (apayToken == address(0)) {
            return feeBps;
        }

        try IERC20Minimal(apayToken).balanceOf(payer) returns (uint256 bal) {
            if (bal >= 200_000 * 1e18) {
                return (feeBps * 20) / 100;
            } else if (bal >= 50_000 * 1e18) {
                return (feeBps * 50) / 100;
            } else if (bal >= 10_000 * 1e18) {
                return (feeBps * 75) / 100;
            }
        } catch {
            return feeBps;
        }

        return feeBps;
    }

    /**
     * @notice Helper to split a standard 65-byte ECDSA signature into (r, s, v).
     */
    function splitSignature(bytes memory sig) public pure returns (bytes32 r, bytes32 s, uint8 v) {
        if (sig.length != 65) revert InvalidSignature();
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        if (v < 27) {
            v += 27;
        }
    }

    /**
     * @notice Recover signer from EIP-712 digest.
     */
    function recoverSigner(bytes32 structHash, bytes memory signature) public view returns (address) {
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(signature);
        address recovered = ecrecover(digest, v, r, s);
        if (recovered == address(0)) revert InvalidSignature();
        return recovered;
    }

    /**
     * @notice Cryptographic verification of Merkle tree proof against root using sorted sibling hashing.
     */
    function verifyMerkleProof(
        bytes32[] calldata proof,
        bytes32 root,
        bytes32 leaf
    ) public pure returns (bool) {
        bytes32 computedHash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }
        return computedHash == root;
    }

    /**
     * @notice Settle a single micro-payment with on-chain EIP-712 signature verification.
     */
    function settleWithSignature(
        address token,
        address payer,
        address receiver,
        uint256 amount,
        string calldata nonce,
        bytes calldata signature
    ) external {
        _verifyAndExecute(token, payer, receiver, amount, nonce, signature);
    }

    /**
     * @notice Settle a batch of micro-payments atomically with EIP-712 signatures.
     */
    function batchSettleWithSignatures(
        address token,
        address[] calldata payers,
        address[] calldata receivers,
        uint256[] calldata amounts,
        string[] calldata nonces,
        bytes[] calldata signatures
    ) external {
        uint256 length = payers.length;
        if (
            length != receivers.length ||
            length != amounts.length ||
            length != nonces.length ||
            length != signatures.length
        ) revert ArrayLengthMismatch();

        for (uint256 i = 0; i < length; i++) {
            _verifyAndExecute(
                token,
                payers[i],
                receivers[i],
                amounts[i],
                nonces[i],
                signatures[i]
            );
        }
    }

    /**
     * @notice Settle and close/flush an off-chain cumulative state channel voucher in 1 transaction.
     * @dev Solves the TPS bottleneck: 100,000 off-chain API calls are settled on-chain with ONE call.
     */
    function closeCumulativeChannel(
        address token,
        bytes32 channelId,
        address payer,
        address receiver,
        uint256 cumulativeAmount,
        uint256 sequence,
        bytes calldata signature
    ) external {
        if (cumulativeAmount == 0 || payer == address(0) || receiver == address(0)) revert InvalidParameters();
        if (sequence <= channelSettledSequence[channelId]) revert StaleChannelSequence();

        // 1. Verify Cumulative Voucher Signature
        bytes32 structHash = keccak256(
            abi.encode(CHANNEL_TYPEHASH, channelId, payer, receiver, cumulativeAmount, sequence)
        );
        address signer = recoverSigner(structHash, signature);
        if (signer != payer) revert InvalidSignature();

        // 2. Set settled sequence to prevent replay
        channelSettledSequence[channelId] = sequence;

        // 3. Execute settlement for the cumulative voucher with dynamic tiered fee
        uint256 effectiveFeeBps = getFeeBpsForPayer(payer);
        uint256 fee = (cumulativeAmount * effectiveFeeBps) / MAX_BPS;
        uint256 netAmount = cumulativeAmount - fee;

        if (fee > 0) {
            if (!IERC20Minimal(token).transferFrom(payer, treasury, fee)) revert TransferFailed();
        }
        if (!IERC20Minimal(token).transferFrom(payer, receiver, netAmount)) revert TransferFailed();

        emit ChannelSettled(channelId, payer, receiver, token, cumulativeAmount, sequence);
    }

    /**
     * @notice Commit a Merkle Root for an epoch of off-chain claims.
     */
    function commitEpochMerkleRoot(
        string calldata epochId,
        bytes32 merkleRoot,
        uint256 totalClaims
    ) external onlyOwner {
        epochMerkleRoots[epochId] = merkleRoot;
        emit EpochMerkleCommitted(epochId, merkleRoot, totalClaims);
    }

    /**
     * @notice Settle an off-chain aggregated net bilateral Merkle claim on-chain.
     * @param epochId The committed epoch identifier.
     * @param token Address of ERC20 payment token (e.g. USDC).
     * @param payer Address of payer.
     * @param receiver Address of receiver.
     * @param amount Net settlement amount.
     * @param merkleProof Array of sibling hashes proving leaf inclusion.
     */
    function settleMerkleClaim(
        string calldata epochId,
        address token,
        address payer,
        address receiver,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) public {
        if (amount == 0 || payer == address(0) || receiver == address(0)) revert InvalidParameters();

        bytes32 root = epochMerkleRoots[epochId];
        if (root == bytes32(0)) revert EpochNotCommitted();

        bytes32 leaf = keccak256(abi.encodePacked(payer, receiver, amount, epochId));
        if (consumedMerkleLeaves[leaf]) revert ClaimAlreadyConsumed();

        if (!verifyMerkleProof(merkleProof, root, leaf)) revert InvalidMerkleProof();

        consumedMerkleLeaves[leaf] = true;

        uint256 effectiveFeeBps = getFeeBpsForPayer(payer);
        uint256 fee = (amount * effectiveFeeBps) / MAX_BPS;
        uint256 netAmount = amount - fee;

        if (fee > 0) {
            if (!IERC20Minimal(token).transferFrom(payer, treasury, fee)) revert TransferFailed();
        }
        if (!IERC20Minimal(token).transferFrom(payer, receiver, netAmount)) revert TransferFailed();

        emit MerkleClaimSettled(epochId, payer, receiver, token, amount, fee, leaf);
    }

    struct MerkleClaimItem {
        address payer;
        address receiver;
        uint256 amount;
        bytes32[] proof;
    }

    /**
     * @notice Batch settle multiple Merkle claims in a single transaction.
     */
    function batchSettleMerkleClaims(
        string calldata epochId,
        address token,
        MerkleClaimItem[] calldata claims
    ) external {
        for (uint256 i = 0; i < claims.length; i++) {
            settleMerkleClaim(
                epochId,
                token,
                claims[i].payer,
                claims[i].receiver,
                claims[i].amount,
                claims[i].proof
            );
        }
    }

    /**
     * @dev Internal helper for signature verification, anti-replay check, and token transfer.
     */
    function _verifyAndExecute(
        address token,
        address payer,
        address receiver,
        uint256 amount,
        string calldata nonce,
        bytes calldata signature
    ) internal {
        if (amount == 0 || payer == address(0) || receiver == address(0)) revert InvalidParameters();

        // 1. Check and consume replay nonce
        bytes32 nonceKey = keccak256(abi.encodePacked(payer, nonce));
        if (consumedNonces[nonceKey]) revert NonceAlreadyConsumed();
        consumedNonces[nonceKey] = true;

        // 2. Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(PAYMENT_TYPEHASH, payer, receiver, amount, keccak256(bytes(nonce)))
        );
        address signer = recoverSigner(structHash, signature);
        if (signer != payer) revert InvalidSignature();

        // 3. Execute transfer with dynamic tiered fee
        uint256 effectiveFeeBps = getFeeBpsForPayer(payer);
        uint256 fee = (amount * effectiveFeeBps) / MAX_BPS;
        uint256 netAmount = amount - fee;

        if (fee > 0) {
            if (!IERC20Minimal(token).transferFrom(payer, treasury, fee)) revert TransferFailed();
        }
        if (!IERC20Minimal(token).transferFrom(payer, receiver, netAmount)) revert TransferFailed();

        emit PaymentSettled(payer, receiver, token, amount, fee, nonce);
    }

    function setTreasury(address _newTreasury) external onlyOwner {
        treasury = _newTreasury;
        emit TreasuryUpdated(_newTreasury);
    }

    function setFeeBps(uint256 _newFeeBps) external onlyOwner {
        if (_newFeeBps > 500) revert InvalidFee();
        feeBps = _newFeeBps;
        emit FeeUpdated(_newFeeBps);
    }

    function setAPAYToken(address _newAPAYToken) external onlyOwner {
        apayToken = _newAPAYToken;
        emit APAYTokenUpdated(_newAPAYToken);
    }
}
