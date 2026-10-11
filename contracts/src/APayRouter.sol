// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title APayRouter
 * @notice Ultra-lightweight settlement router for AI Agent micropayments.
 * @dev Enforces 1.0% (or configurable) protocol fee and atomic batch settlements.
 */
interface IERC20Minimal {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract APayRouter {
    address public immutable owner;
    address public treasury;
    uint256 public feeBps; // 100 bps = 1.0%
    uint256 public constant MAX_BPS = 10000;

    event PaymentSettled(
        address indexed payer,
        address indexed receiver,
        address indexed token,
        uint256 totalAmount,
        uint256 feeAmount,
        string nonce
    );

    event TreasuryUpdated(address indexed newTreasury);
    event FeeUpdated(uint256 newFeeBps);

    error Unauthorized();
    error InvalidFee();
    error TransferFailed();
    error ArrayLengthMismatch();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address _treasury, uint256 _initialFeeBps) {
        if (_initialFeeBps > 500) revert InvalidFee(); // Max 5% safety cap
        owner = msg.sender;
        treasury = _treasury;
        feeBps = _initialFeeBps; // e.g. 100 = 1%
    }

    /**
     * @notice Settle a single micro-payment from agent to merchant.
     * @param token Address of ERC20 token (e.g. USDC).
     * @param payer Address of the agent / budget vault.
     * @param receiver Address of the API / service provider.
     * @param amount Total amount in token base units.
     * @param nonce Replay prevention identifier.
     */
    function settle(
        address token,
        address payer,
        address receiver,
        uint256 amount,
        string calldata nonce
    ) external {
        uint256 fee = (amount * feeBps) / MAX_BPS;
        uint256 netAmount = amount - fee;

        if (fee > 0) {
            if (!IERC20Minimal(token).transferFrom(payer, treasury, fee)) revert TransferFailed();
        }
        if (!IERC20Minimal(token).transferFrom(payer, receiver, netAmount)) revert TransferFailed();

        emit PaymentSettled(payer, receiver, token, amount, fee, nonce);
    }

    /**
     * @notice Settle a batch of micro-payments atomically in a single transaction.
     * @param token Address of ERC20 token (e.g. USDC or APAY).
     * @param payers Array of payer addresses.
     * @param receivers Array of receiver/merchant addresses.
     * @param amounts Array of amounts in base units.
     * @param nonces Array of replay prevention nonces.
     */
    function batchSettle(
        address token,
        address[] calldata payers,
        address[] calldata receivers,
        uint256[] calldata amounts,
        string[] calldata nonces
    ) external {
        uint256 length = payers.length;
        if (
            length != receivers.length ||
            length != amounts.length ||
            length != nonces.length
        ) revert ArrayLengthMismatch();

        for (uint256 i = 0; i < length; i++) {
            uint256 amount = amounts[i];
            uint256 fee = (amount * feeBps) / MAX_BPS;
            uint256 netAmount = amount - fee;

            if (fee > 0) {
                if (!IERC20Minimal(token).transferFrom(payers[i], treasury, fee)) revert TransferFailed();
            }
            if (!IERC20Minimal(token).transferFrom(payers[i], receivers[i], netAmount)) revert TransferFailed();

            emit PaymentSettled(payers[i], receivers[i], token, amount, fee, nonces[i]);
        }
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
}
