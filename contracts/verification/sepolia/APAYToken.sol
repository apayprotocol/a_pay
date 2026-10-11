// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title APAYToken (A-Pay Protocol Token)
 * @author A-Pay Protocol Core Swarm
 * @notice Native utility & economic engine token for the A-Pay Protocol on Base L2.
 * @dev Implements standard ERC-20 with a fixed 100,000,000 supply cap and deflationary burn mechanisms.
 */

interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IERC20Metadata is IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

contract APAYToken is IERC20Metadata {
    string private constant _NAME = "A-Pay Protocol Token";
    string private constant _SYMBOL = "APAY";
    uint8 private constant _DECIMALS = 18;
    uint256 private constant _INITIAL_SUPPLY = 100_000_000 * 10 ** _DECIMALS; // 100 Million Tokens

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // Deflationary Burn Event
    event TokensBurned(address indexed burner, uint256 amount, uint256 remainingSupply);

    // Custom Errors for gas optimization
    error InsufficientBalance(address account, uint256 currentBalance, uint256 needed);
    error InsufficientAllowance(address spender, uint256 currentAllowance, uint256 needed);
    error InvalidZeroAddress();
    error ExceedsMaxSupply();

    /**
     * @notice Initializes token and mints total fixed supply to deployer.
     * @dev No further mint function exists. Hard cap is immutable.
     */
    constructor() {
        _totalSupply = _INITIAL_SUPPLY;
        _balances[msg.sender] = _INITIAL_SUPPLY;
        emit Transfer(address(0), msg.sender, _INITIAL_SUPPLY);
    }

    // --- Metadata ---

    function name() external pure override returns (string memory) {
        return _NAME;
    }

    function symbol() external pure override returns (string memory) {
        return _SYMBOL;
    }

    function decimals() external pure override returns (uint8) {
        return _DECIMALS;
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    // --- Transfers ---

    function transfer(address to, uint256 amount) external override returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < amount) {
                revert InsufficientAllowance(msg.sender, currentAllowance, amount);
            }
            unchecked {
                _approve(from, msg.sender, currentAllowance - amount);
            }
        }
        _transfer(from, to, amount);
        return true;
    }

    // --- Deflationary Burn Engine (Buyback & Burn Support) ---

    /**
     * @notice Burns tokens from caller's balance, permanently reducing circulating supply.
     * @param amount Quantity of tokens to destroy in base units (wei).
     */
    function burn(uint256 amount) external returns (bool) {
        _burn(msg.sender, amount);
        return true;
    }

    /**
     * @notice Burns tokens on behalf of another address (requires prior ERC-20 approval).
     * @dev Used by APayRouter during automated Buyback & Burn execution.
     */
    function burnFrom(address from, uint256 amount) external returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < amount) {
                revert InsufficientAllowance(msg.sender, currentAllowance, amount);
            }
            unchecked {
                _approve(from, msg.sender, currentAllowance - amount);
            }
        }
        _burn(from, amount);
        return true;
    }

    // --- Internal Primitives ---

    function _transfer(address from, address to, uint256 amount) internal {
        if (from == address(0) || to == address(0)) revert InvalidZeroAddress();

        uint256 senderBalance = _balances[from];
        if (senderBalance < amount) {
            revert InsufficientBalance(from, senderBalance, amount);
        }

        unchecked {
            _balances[from] = senderBalance - amount;
            _balances[to] += amount;
        }

        emit Transfer(from, to, amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        if (owner == address(0) || spender == address(0)) revert InvalidZeroAddress();
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _burn(address account, uint256 amount) internal {
        if (account == address(0)) revert InvalidZeroAddress();

        uint256 accountBalance = _balances[account];
        if (accountBalance < amount) {
            revert InsufficientBalance(account, accountBalance, amount);
        }

        unchecked {
            _balances[account] = accountBalance - amount;
            _totalSupply -= amount;
        }

        emit Transfer(account, address(0), amount);
        emit TokensBurned(account, amount, _totalSupply);
    }
}
