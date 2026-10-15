// Flattened from Uniswap/continuous-clearing-auction PR #367 at 315ee240709a8a9c04c7c976edf15bd5b5e2a115.
// SPDX-License-Identifier: MIT
pragma solidity =0.8.26 ^0.8.0 ^0.8.20 ^0.8.26 ^0.8.4;

// lib/blocknumberish/src/BlockNumberish.sol

/// @title BlockNumberish
/// A helper contract to get the current block number on different chains
/// inspired by https://github.com/ProjectOpenSea/tstorish/blob/main/src/Tstorish.sol
/// @custom:security-contact security@uniswap.org
contract BlockNumberish {
    // Unichain chain ID.
    uint256 private constant UNICHAIN_CHAIN_ID = 130;
    /// @dev Function selector for arbBlockNumber() from: https://github.com/OffchainLabs/nitro-precompile-interfaces/blob/f49a4889b486fd804a7901203f5f663cfd1581c8/ArbSys.sol#L17
    uint32 private constant ARB_SYS_SELECTOR = 0xa3b1b31d;
    /// @dev Arbitrum system contract address (address(100))
    uint8 private constant ARB_SYS_ADDRESS = 0x64;
    /// @dev Function selector for getFlashblockNumber() from: https://github.com/Uniswap/flashblocks_number_contract/blob/a667d57f0055de80b9909c8837e872c4364853c3/src/IFlashblockNumber.sol#L70
    uint32 private constant UNICHAIN_FLASHBLOCK_NUMBER_SELECTOR = 0xe5b37c5d;
    /// @dev Unichain flashblock number address
    address private constant UNICHAIN_FLASHBLOCK_NUMBER_ADDRESS = 0x3c3A8a41E095C76b03f79f70955fFf3b03cf753E;

    /// @dev Whether to override the block number with the ArbSys precompile. Supports all Arbitrum and Orbit chains.
    bool private immutable _USE_ARB_SYS;

    constructor() {
        bool useArbSys;
        assembly {
            if extcodesize(ARB_SYS_ADDRESS) {
                mstore(0x00, ARB_SYS_SELECTOR)
                // staticcall(gas, address, argsOffset, argsSize, retOffset, retSize)
                let success := staticcall(gas(), ARB_SYS_ADDRESS, 0x1c, 0x04, 0x00, 0x20)
                // per the interface, require the call to succeed and return a 32 byte value
                useArbSys := and(success, eq(returndatasize(), 0x20))
            }
        }
        _USE_ARB_SYS = useArbSys;
    }

    /// @notice Internal view function to get the current block number.
    /// @dev Returns the Arbitrum block number on chains exposing the ArbSys precompile, standard block number elsewhere.
    function _getBlockNumberish() internal view returns (uint256 blockNumber) {
        if (_USE_ARB_SYS) {
            assembly {
                mstore(0x00, ARB_SYS_SELECTOR)
                // staticcall(gas, address, argsOffset, argsSize, retOffset, retSize)
                let success := staticcall(gas(), ARB_SYS_ADDRESS, 0x1c, 0x04, 0x00, 0x20)
                // revert if the call fails from OOG or returns malformed data
                if or(iszero(success), iszero(eq(returndatasize(), 0x20))) {
                    revert(0, 0)
                }

                // load the stored block number from memory
                blockNumber := mload(0x00)
            }
        } else {
            blockNumber = block.number;
        }
    }

    /// @notice Internal view function to get the current flashblock number.
    /// @dev Returns Unichain flashblock number on Unichain, 0 elsewhere.
    function _getFlashblockNumberish() internal view returns (uint256 flashblockNumber) {
        if (block.chainid == UNICHAIN_CHAIN_ID) {
            assembly {
                mstore(0x00, UNICHAIN_FLASHBLOCK_NUMBER_SELECTOR)
                // staticcall(gas, address, argsOffset, argsSize, retOffset, retSize)
                let success := staticcall(gas(), UNICHAIN_FLASHBLOCK_NUMBER_ADDRESS, 0x1c, 0x04, 0x00, 0x20)
                // revert if the call fails from OOG or returns malformed data
                if or(iszero(success), iszero(eq(returndatasize(), 0x20))) {
                    revert(0, 0)
                }

                // load the stored block number from memory
                flashblockNumber := mload(0x00)
            }
        }
    }
}

// src/libraries/ConstantsLib.sol

/// @title ConstantsLib
/// @notice Library containing protocol constants
library ConstantsLib {
    /// @notice we use milli-bips, or one thousandth of a basis point
    uint24 constant MPS = 1e7;
    /// @notice The upper bound of a ValueX7 value
    uint256 constant X7_UPPER_BOUND = type(uint256).max / 1e7;

    /// @notice The maximum total supply of tokens that can be sold in the Auction
    /// @dev    This is set to 2^100 tokens, which is just above 1e30, or one trillion units of a token with 18 decimals.
    ///         This upper bound is chosen to prevent the Auction from being used with an extremely large token supply,
    ///         which would restrict the clearing price to be a very low price in the calculation below.
    uint128 constant MAX_TOTAL_SUPPLY = 1 << 100;

    /// @notice The minimum allowable floor price is 2^32 + 1
    /// @dev Ensures the Q96 reciprocal `(1 << 192) / priceX96` fits in a uint160
    uint256 constant MIN_FLOOR_PRICE = (1 << 32) + 1;

    /// @notice The minimum allowable tick spacing
    /// @dev We don't support tick spacings of 1 to avoid edge cases where the rounding of the clearing price
    ///      would cause the price to move between initialized ticks.
    uint256 constant MIN_TICK_SPACING = 2;
}

// lib/liquidity-launcher/src/interfaces/IDistributor.sol

/// @title IDistributor
/// @notice Interface for token distributors.
/// @dev Distributors are meant to be used with a push based token model: the caller sends token funds
///      first, then MUST call `onTokensReceived()` after sending the funds.
interface IDistributor {
    /// @notice Error thrown when the token address is invalid
    error InvalidToken(address token);

    /// @notice Error thrown when the amount received is invalid upon receiving tokens
    /// @param expected The expected amount
    /// @param received The received amount
    error InvalidAmountReceived(uint256 expected, uint256 received);

    /// @notice Notify a distributor that it has received the tokens to distribute.
    /// @dev MUST be called by the token sender after token funds are sent to the distributor.
    function onTokensReceived() external;
}

// lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol

// OpenZeppelin Contracts (last updated v5.1.0) (utils/introspection/IERC165.sol)

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// src/interfaces/ITickStorage.sol

/// @notice Each tick contains a pointer to the next Q96 price in the linked list
///         and the cumulative currency demand at the tick's Q96 price level
struct Tick {
    uint256 next;
    uint256 currencyDemandQ96;
}

/// @title ITickStorage
/// @notice Interface for the TickStorage contract
interface ITickStorage {
    /// @notice Error thrown when the tick spacing is too small
    error TickSpacingTooSmall();
    /// @notice Error thrown when the floor price is zero
    error FloorPriceIsZero();
    /// @notice Error thrown when the floor price is below the minimum floor price
    error FloorPriceTooLow();
    /// @notice Error thrown when the previous Q96 price hint is invalid (higher than the new Q96 price)
    error TickPreviousPriceInvalid();
    /// @notice Error thrown when the tick price is not increasing
    error TickPriceNotIncreasing();
    /// @notice Error thrown when the tick is not initialized
    error TickNotInitialized();
    /// @notice Error thrown when the Q96 price is not at a boundary designated by the tick spacing
    error TickPriceNotAtBoundary();
    /// @notice Error thrown when the tick price is invalid
    error InvalidTickPrice();
    /// @notice Error thrown when trying to update the demand of an uninitialized tick
    error CannotUpdateUninitializedTick();

    /// @notice Emitted when a tick is initialized
    /// @param priceQ96 The Q96 price of the tick
    event TickInitialized(uint256 priceQ96);

    /// @notice Emitted when the nextActiveTick is updated
    /// @param priceQ96 The Q96 price of the tick
    event NextActiveTickUpdated(uint256 priceQ96);

    /// @notice The Q96 price of the next initialized tick above the clearing price
    /// @dev This will be MAX_TICK_PTR if there are no initialized ticks above the clearing price
    /// @return The Q96 price of the next active tick
    function nextActiveTickPrice() external view returns (uint256);

    /// @notice Get the Q96 floor price of the auction
    /// @return The minimum Q96 price for bids
    function floorPrice() external view returns (uint256);

    /// @notice Get the Q96 tick spacing enforced for bid prices
    /// @return The Q96 tick spacing value
    function tickSpacing() external view returns (uint256);

    /// @notice Get a tick at a Q96 price
    /// @dev The returned tick is not guaranteed to be initialized
    /// @param priceQ96 The Q96 price of the tick, which must be at a boundary designated by the tick spacing
    /// @return The tick at the given Q96 price
    function ticks(uint256 priceQ96) external view returns (Tick memory);
}

// src/interfaces/IValidationHook.sol

/// @notice Interface for custom bid validation logic
interface IValidationHook {
    /// @notice Validate a bid
    /// @dev MUST revert if the bid is invalid
    /// @param maxPrice The maximum price the bidder is willing to pay
    /// @param amount The amount of the bid
    /// @param owner The owner of the bid
    /// @param sender The sender of the bid
    /// @param hookData Additional data to pass to the hook required for validation
    function validate(uint256 maxPrice, uint128 amount, address owner, address sender, bytes calldata hookData) external;
}

// src/libraries/StepLib.sol

struct AuctionStep {
    uint24 mps; // Mps to sell per block in the step
    uint64 startBlock; // Start block of the step (inclusive)
    uint64 endBlock; // Ending block of the step (exclusive)
}

/// @notice Library for auction step calculations and parsing
library StepLib {
    using StepLib for *;

    /// @notice The size of a uint64 in bytes
    uint256 public constant UINT64_SIZE = 8;

    /// @notice Error thrown when the offset is too large for the data length
    error StepLib__InvalidOffsetTooLarge();
    /// @notice Error thrown when the offset is not at a step boundary - a uint64 aligned offset
    error StepLib__InvalidOffsetNotAtStepBoundary();

    /// @notice Unpack the mps and block delta from the auction steps data
    function parse(bytes8 data) internal pure returns (uint24 mps, uint40 blockDelta) {
        mps = uint24(bytes3(data));
        blockDelta = uint40(uint64(data));
    }

    /// @notice Load a word at `offset` from data and parse it into mps and blockDelta
    function get(bytes memory data, uint256 offset) internal pure returns (uint24 mps, uint40 blockDelta) {
        // Offset cannot be greater than the data length
        if (offset >= data.length) revert StepLib__InvalidOffsetTooLarge();
        // Offset must be a multiple of a step (uint64 -  uint24|uint40)
        if (offset % UINT64_SIZE != 0) revert StepLib__InvalidOffsetNotAtStepBoundary();

        assembly {
            let packedValue := mload(add(add(data, 0x20), offset))
            packedValue := shr(192, packedValue)
            mps := shr(40, packedValue)
            blockDelta := and(packedValue, 0xFFFFFFFFFF)
        }
    }
}

// src/libraries/ValueX7Lib.sol

/// @notice A ValueX7 is a uint256 value that has been multiplied by 1e7 (ConstantsLib.MPS)
/// @dev X7 values are used for demand and supply values to defer division
type ValueX7 is uint256;

using {add as +, sub as -, gte as >=, min} for ValueX7 global;

/// @notice Add two ValueX7 values and return the result as a ValueX7
function add(ValueX7 a, ValueX7 b) pure returns (ValueX7) {
    return ValueX7.wrap(ValueX7.unwrap(a) + ValueX7.unwrap(b));
}

/// @notice Subtract two ValueX7 values and return the result as a ValueX7
function sub(ValueX7 a, ValueX7 b) pure returns (ValueX7) {
    return ValueX7.wrap(ValueX7.unwrap(a) - ValueX7.unwrap(b));
}

/// @notice Return true if a is greater than or equal to b
function gte(ValueX7 a, ValueX7 b) pure returns (bool) {
    return ValueX7.unwrap(a) >= ValueX7.unwrap(b);
}

/// @notice Return the minimum of two ValueX7 values
/// @dev Branchless ternary evaluation for `a < b ? a : b`
function min(ValueX7 a, ValueX7 b) pure returns (ValueX7) {
    uint256 a_ = ValueX7.unwrap(a);
    uint256 b_ = ValueX7.unwrap(b);
    uint256 c_;
    /// @solidity memory-safe-assembly
    assembly {
        c_ := xor(a_, mul(xor(a_, b_), lt(b_, a_)))
    }
    return ValueX7.wrap(c_);
}

// src/libraries/BidLib.sol

struct Bid {
    uint64 startBlock; // Block number when the bid was first made in
    uint24 startCumulativeMps; // Cumulative mps at the start of the bid
    uint64 exitedBlock; // Block number when the bid was exited
    uint256 maxPrice; // The max price of the bid
    address owner; // Who will receive the tokens filled and currency refunded
    uint256 amountQ96; // User's currency amount in Q96 form
    uint256 tokensFilled; // Amount of tokens filled
}

/// @title BidLib
library BidLib {
    using BidLib for *;

    /// @dev Error thrown when a bid is submitted with no remaining percentage of the auction
    ///      This is prevented by the auction contract as bids cannot be submitted when the auction is sold out,
    ///      but we catch it instead of reverting with division by zero.
    error MpsRemainingIsZero();

    /// @notice Calculate the number of mps remaining in the auction since the bid was submitted
    /// @param bid The bid to calculate the remaining mps for
    /// @return The number of mps remaining in the auction
    function mpsRemainingInAuctionAfterSubmission(Bid memory bid) internal pure returns (uint24) {
        return ConstantsLib.MPS - bid.startCumulativeMps;
    }

    /// @notice Scale a bid amount to its effective amount over the remaining percentage of the auction
    ///         This is an important normalization step to ensure that we can calculate the currencyRaised
    ///         when cumulative demand is less than supply using the original supply schedule.
    /// @param bid The bid to scale
    /// @return The scaled amount
    function toEffectiveAmount(Bid memory bid) internal pure returns (uint256) {
        uint24 mpsRemainingInAuction = bid.mpsRemainingInAuctionAfterSubmission();
        if (mpsRemainingInAuction == 0) revert MpsRemainingIsZero();
        return bid.amountQ96 * ConstantsLib.MPS / mpsRemainingInAuction;
    }
}

// src/interfaces/IAuctionStorage.sol

/// @notice Interface for auction storage operations
interface IAuctionStorage {
    /// @notice Error thrown when the token is the native currency
    error TokenIsAddressZero();
    /// @notice Error thrown when the token and currency are the same
    error TokenAndCurrencyCannotBeTheSame();
    /// @notice Error thrown when the total supply is zero
    error TotalSupplyIsZero();
    /// @notice Error thrown when the total supply is too large
    error TotalSupplyIsTooLarge();
    /// @notice Error thrown when the funds recipient is the zero address
    error FundsRecipientIsZero();
    /// @notice Error thrown when the tokens recipient is the zero address
    error TokensRecipientIsZero();
    /// @notice Error thrown when the currency cannot be swept
    error CannotSweepCurrency();
    /// @notice Error thrown when the tokens cannot be swept
    error CannotSweepTokens();
    /// @notice Error thrown when the auction has not graduated
    error NotGraduated();

    /// @notice Emitted when the tokens are swept
    /// @param tokensRecipient The address of the tokens recipient
    /// @param tokensAmount The amount of tokens swept
    event TokensSwept(address indexed tokensRecipient, uint256 tokensAmount);

    /// @notice Emitted when the currency is swept
    /// @param fundsRecipient The address of the funds recipient
    /// @param currencyAmount The amount of currency swept
    event CurrencySwept(address indexed fundsRecipient, uint256 currencyAmount);

    /// @notice The currency raised as of the last checkpoint in Q96 representation, scaled up by X7
    /// @dev Most use cases will want to use `currencyRaised()` instead
    /// @dev Any protocol fees set are NOT subtracted from the returned amount
    function currencyRaisedQ96X7() external view returns (ValueX7);

    /// @notice Get the currency raised at the last checkpointed block
    /// @dev Any protocol fees set are NOT subtracted from the returned amount
    /// @dev Relies on the latest checkpoint which may be out of date
    function currencyRaised() external view returns (uint256);

    /// @notice The sum of demand in ticks above the clearing price
    function sumCurrencyDemandAboveClearingQ96() external view returns (uint256);

    /// @notice The total currency raised as of the last checkpoint in Q96 representation, scaled up by X7
    function totalClearedQ96X7() external view returns (ValueX7);

    /// @notice The total tokens cleared as of the last checkpoint in uint256 representation
    /// @dev Loses precision from dividing into uint256 form
    function totalCleared() external view returns (uint256);

    /// @notice The remaining supply of tokens in Q96 representation, scaled up by X7
    /// @dev Relies on the latest checkpoint which may be out of date
    function remainingSupplyQ96X7() external view returns (ValueX7);

    /// @notice The remaining supply of tokens in uint256 representation
    /// @dev Loses precision from dividing into uint256 form
    /// @dev Relies on the latest checkpoint which may be out of date
    function remainingSupply() external view returns (uint256);
}

// lib/openzeppelin-contracts/contracts/token/ERC1155/IERC1155.sol

// OpenZeppelin Contracts (last updated v5.3.0) (token/ERC1155/IERC1155.sol)

/**
 * @dev Required interface of an ERC-1155 compliant contract, as defined in the
 * https://eips.ethereum.org/EIPS/eip-1155[ERC].
 */
interface IERC1155 is IERC165 {
    /**
     * @dev Emitted when `value` amount of tokens of type `id` are transferred from `from` to `to` by `operator`.
     */
    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);

    /**
     * @dev Equivalent to multiple {TransferSingle} events, where `operator`, `from` and `to` are the same for all
     * transfers.
     */
    event TransferBatch(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256[] ids,
        uint256[] values
    );

    /**
     * @dev Emitted when `account` grants or revokes permission to `operator` to transfer their tokens, according to
     * `approved`.
     */
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);

    /**
     * @dev Emitted when the URI for token type `id` changes to `value`, if it is a non-programmatic URI.
     *
     * If an {URI} event was emitted for `id`, the standard
     * https://eips.ethereum.org/EIPS/eip-1155#metadata-extensions[guarantees] that `value` will equal the value
     * returned by {IERC1155MetadataURI-uri}.
     */
    event URI(string value, uint256 indexed id);

    /**
     * @dev Returns the value of tokens of token type `id` owned by `account`.
     */
    function balanceOf(address account, uint256 id) external view returns (uint256);

    /**
     * @dev xref:ROOT:erc1155.adoc#batch-operations[Batched] version of {balanceOf}.
     *
     * Requirements:
     *
     * - `accounts` and `ids` must have the same length.
     */
    function balanceOfBatch(
        address[] calldata accounts,
        uint256[] calldata ids
    ) external view returns (uint256[] memory);

    /**
     * @dev Grants or revokes permission to `operator` to transfer the caller's tokens, according to `approved`,
     *
     * Emits an {ApprovalForAll} event.
     *
     * Requirements:
     *
     * - `operator` cannot be the zero address.
     */
    function setApprovalForAll(address operator, bool approved) external;

    /**
     * @dev Returns true if `operator` is approved to transfer ``account``'s tokens.
     *
     * See {setApprovalForAll}.
     */
    function isApprovedForAll(address account, address operator) external view returns (bool);

    /**
     * @dev Transfers a `value` amount of tokens of type `id` from `from` to `to`.
     *
     * WARNING: This function can potentially allow a reentrancy attack when transferring tokens
     * to an untrusted contract, when invoking {IERC1155Receiver-onERC1155Received} on the receiver.
     * Ensure to follow the checks-effects-interactions pattern and consider employing
     * reentrancy guards when interacting with untrusted contracts.
     *
     * Emits a {TransferSingle} event.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - If the caller is not `from`, it must have been approved to spend ``from``'s tokens via {setApprovalForAll}.
     * - `from` must have a balance of tokens of type `id` of at least `value` amount.
     * - If `to` refers to a smart contract, it must implement {IERC1155Receiver-onERC1155Received} and return the
     * acceptance magic value.
     */
    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes calldata data) external;

    /**
     * @dev xref:ROOT:erc1155.adoc#batch-operations[Batched] version of {safeTransferFrom}.
     *
     * WARNING: This function can potentially allow a reentrancy attack when transferring tokens
     * to an untrusted contract, when invoking {IERC1155Receiver-onERC1155BatchReceived} on the receiver.
     * Ensure to follow the checks-effects-interactions pattern and consider employing
     * reentrancy guards when interacting with untrusted contracts.
     *
     * Emits either a {TransferSingle} or a {TransferBatch} event, depending on the length of the array arguments.
     *
     * Requirements:
     *
     * - `ids` and `values` must have the same length.
     * - If `to` refers to a smart contract, it must implement {IERC1155Receiver-onERC1155BatchReceived} and return the
     * acceptance magic value.
     */
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external;
}

// src/interfaces/IStepStorage.sol

/// @notice Interface for managing auction step storage
interface IStepStorage {
    /// @notice Error thrown when the end block is equal to or before the start block
    error InvalidEndBlock();
    /// @notice Error thrown when the claim block is before the end block
    error ClaimBlockIsBeforeEndBlock();
    /// @notice Error thrown when the auction is over
    error AuctionIsOver();
    /// @notice Error thrown when the auction is not over
    error AuctionIsNotOver();
    /// @notice Error thrown when the bid is not claimable
    error NotClaimable();
    /// @notice Error thrown when the auction data length is invalid
    error InvalidAuctionDataLength();
    /// @notice Error thrown when the block delta in a step is zero
    error StepBlockDeltaCannotBeZero();
    /// @notice Error thrown when the mps is invalid
    /// @param actualMps The sum of the mps times the block delta
    /// @param expectedMps The expected mps of the auction (ConstantsLib.MPS)
    error InvalidStepDataMps(uint256 actualMps, uint256 expectedMps);
    /// @notice Error thrown when the calculated end block is invalid
    /// @param actualEndBlock The calculated end block from the step data
    /// @param expectedEndBlock The expected end block from the constructor
    error InvalidEndBlockGivenStepData(uint64 actualEndBlock, uint64 expectedEndBlock);

    /// @notice The address pointer to the contract deployed by SSTORE2
    /// @return The address pointer
    function pointer() external view returns (address);

    /// @notice Get the current active auction step
    function step() external view returns (AuctionStep memory);

    /// @notice Emitted when an auction step is recorded
    /// @param startBlock The start block of the auction step
    /// @param endBlock The end block of the auction step
    /// @param mps The percentage of total tokens to sell per block during this auction step, represented in ten-millionths of the total supply (1e7 = 100%)
    event AuctionStepRecorded(uint256 startBlock, uint256 endBlock, uint24 mps);
}

// src/libraries/CheckpointLib.sol

struct Checkpoint {
    uint256 clearingPrice; // The X96 price which the auction is currently clearing at
    ValueX7 currencyRaisedAtClearingPriceQ96X7; // The currency raised so far to this clearing price
    uint256 cumulativeMpsPerPrice; // A running sum of the ratio between mps and price
    uint24 cumulativeMps; // The number of mps sold in the auction so far (via the original supply schedule)
    uint64 prev; // Block number of the previous checkpoint
    uint64 next; // Block number of the next checkpoint
}

/// @title CheckpointLib
library CheckpointLib {
    /// @notice Get the remaining mps in the auction at the given checkpoint
    /// @param _checkpoint The checkpoint with `cumulativeMps` so far
    /// @return The remaining mps in the auction
    function remainingMpsInAuction(Checkpoint memory _checkpoint) internal pure returns (uint24) {
        return ConstantsLib.MPS - _checkpoint.cumulativeMps;
    }

    /// @notice Calculate the supply to price ratio. Will return zero if `price` is zero
    /// @dev This function returns a value in Q96 form
    /// @param mps The number of supply mps sold
    /// @param price The price they were sold at
    /// @return the ratio
    function getMpsPerPrice(uint24 mps, uint256 price) internal pure returns (uint256) {
        if (price == 0) return 0;
        // The bitshift cannot overflow because a uint24 shifted left FixedPoint96.RESOLUTION * 2 (192) bits will always be less than 2^256
        return (uint256(mps) << 192) / price;
    }
}

// src/interfaces/IBidStorage.sol

/// @notice Interface for bid storage operations
interface IBidStorage {
    /// @notice Error thrown when doing an operation on a bid that does not exist
    error BidIdDoesNotExist(uint256 bidId);

    /// @notice Get the id of the next bid to be created
    /// @return The id of the next bid to be created
    function nextBidId() external view returns (uint256);

    /// @notice Get a bid from storage
    /// @dev Will revert if the bid does not exist
    /// @param bidId The id of the bid to get
    /// @return The bid
    function bids(uint256 bidId) external view returns (Bid memory);
}

// lib/liquidity-launcher/src/interfaces/ILBPInitializer.sol

/// @dev The interface id of the ILBPInitializer interface
/// @dev Per ERC165, the interface selector is the XOR of the selectors of the interfaces implemented by the contract
bytes4 constant ILBP_INITIALIZER_INTERFACE_ID = type(ILBPInitializer).interfaceId;

/// @notice General parameters for initializing an LBP strategy
struct LBPInitializationParams {
    uint256 initialPriceX96; // the price discovered by the contract
    uint256 tokensSold; // the number of tokens sold by the contract
    uint256 currencyRaised; // the amount of currency raised by the contract
}

/// @title ILBPInitializer
/// @notice Generic interface for contracts used for initializing an LBP strategy
interface ILBPInitializer is IDistributor, IERC165 {
    /// @notice Returns the LBP initialization parameters as determined by the implementing contract
    /// @dev The implementing contract MUST ensure that these values are correct at the time of calling
    function lbpInitializationParams() external view returns (LBPInitializationParams memory);

    /// @notice Sweeps the raised currency from the initializer. Must NOT revert.
    /// @dev The initializer must ensure this can only be called by the currency recipient directly.
    /// @dev MUST transfer exactly `currencyRaised` (from {lbpInitializationParams}) to the funds recipient.
    ///      `tryMigrate` enforces `received == currencyRaised` and reverts if unequal. Any surplus held by the
    ///      initializer must be left behind, not swept here.
    function sweepCurrency() external;

    /// @notice Sweeps the unsold tokens from the initializer. Must NOT revert.
    /// @dev The initializer must ensure this can only be called by the tokens recipient directly
    function sweepUnsoldTokens() external;

    /// @notice Returns the token used by the initializer
    function token() external view returns (address);
    /// @notice Returns the currency used by the initializer
    function currency() external view returns (address);
    /// @notice Returns the total supply of the token used by the initializer
    function totalSupply() external view returns (uint128);
    /// @notice Returns the address which will receive the unsold tokens
    function tokensRecipient() external view returns (address);
    /// @notice Returns the address which will receive the raised currency
    function fundsRecipient() external view returns (address);
    /// @notice Returns the start block of the initializer
    function startBlock() external view returns (uint64);
    /// @notice Returns the end block of the initializer
    function endBlock() external view returns (uint64);
}

// src/periphery/validationHooks/ValidationHookIntrospection.sol

interface IValidationHookIntrospection is IValidationHook, IERC165 {}

/// @notice Base contract for validation hooks supporting basic introspection
/// @dev Offchain interfaces and integrators should query `supportsInterface` to identify supported hook interfaces
abstract contract ValidationHookIntrospection is IValidationHookIntrospection {
    /// @inheritdoc IERC165
    function supportsInterface(bytes4 _interfaceId) public view virtual returns (bool) {
        return _interfaceId == type(IValidationHook).interfaceId || _interfaceId == type(IERC165).interfaceId;
    }
}

// src/interfaces/ICheckpointStorage.sol

/// @notice Interface for checkpoint storage operations
interface ICheckpointStorage {
    /// @notice Revert when attempting to insert a checkpoint at a block number not strictly greater than the last one
    error CheckpointBlockNotIncreasing();

    /// @notice Get the latest checkpoint at the last checkpointed block
    /// @dev Be aware that the latest checkpoint may not be up to date, it is recommended
    ///      to always call `checkpoint()` before using getter functions
    /// @return The latest checkpoint
    function latestCheckpoint() external view returns (Checkpoint memory);

    /// @notice Get the number of the last checkpointed block
    /// @dev Be aware that the last checkpointed block may not be up to date, it is recommended
    ///      to always call `checkpoint()` before using getter functions
    /// @return The block number of the last checkpoint
    function lastCheckpointedBlock() external view returns (uint64);

    /// @notice Get a checkpoint at a block number
    /// @param blockNumber The block number to get the checkpoint for
    function checkpoints(uint64 blockNumber) external view returns (Checkpoint memory);
}

// src/periphery/validationHooks/BaseERC1155ValidationHook.sol

/// @notice Errors shared by ERC1155 validation hooks
interface IERC1155ValidationErrors {
    /// @notice Error thrown when the token address is invalid
    error InvalidTokenAddress();
    /// @notice Error thrown when the sender is not the owner of the ERC1155 tokenId
    error NotOwnerOfERC1155Token(uint256 tokenId);
    /// @notice Error thrown when the sender is not the owner of the bid
    error SenderMustBeOwner();
}

interface IBaseERC1155ValidationHook is IValidationHookIntrospection, IERC1155ValidationErrors {
    /// @notice The ERC1155 token contract that is checked for ownership
    /// @dev Callers should query the returned interface's `balanceOf` method
    function erc1155() external view returns (IERC1155);
    /// @notice The ERC1155 tokenId that is checked for ownership
    function tokenId() external view returns (uint256);
}

/// @notice Base validation hook for ERC1155 tokens
/// @dev This hook validates that the sender is the owner of a specific ERC1155 tokenId
///      It is highly recommended to make the ERC1155 soulbound (non-transferable)
contract BaseERC1155ValidationHook is IBaseERC1155ValidationHook, ValidationHookIntrospection {
    /// @inheritdoc IBaseERC1155ValidationHook
    IERC1155 public immutable erc1155;
    /// @inheritdoc IBaseERC1155ValidationHook
    uint256 public immutable tokenId;

    /// @notice Emitted when the ERC1155 tokenId is set
    /// @param tokenAddress The address of the ERC1155 token
    /// @param tokenId The ID of the ERC1155 token
    event ERC1155TokenIdSet(address indexed tokenAddress, uint256 tokenId);

    constructor(address _erc1155, uint256 _tokenId) {
        if (_erc1155 == address(0)) revert InvalidTokenAddress();
        erc1155 = IERC1155(_erc1155);
        tokenId = _tokenId;
        emit ERC1155TokenIdSet(_erc1155, tokenId);
    }

    /// @notice Require that the `owner` and `sender` of the bid hold at least one of the required ERC1155 token
    /// @inheritdoc IValidationHook
    function validate(uint256, uint128, address owner, address sender, bytes calldata) public view virtual {
        if (sender != owner) revert SenderMustBeOwner();
        if (erc1155.balanceOf(owner, tokenId) == 0) revert NotOwnerOfERC1155Token(tokenId);
    }

    /// @dev Extend the existing introspection support to signal that derived contracts inherit from BaseERC1155ValidationHook
    function supportsInterface(bytes4 _interfaceId)
        public
        view
        virtual
        override(ValidationHookIntrospection, IERC165)
        returns (bool)
    {
        return super.supportsInterface(_interfaceId) || _interfaceId == type(IBaseERC1155ValidationHook).interfaceId;
    }
}

// src/interfaces/IContinuousClearingAuction.sol

/// @notice Parameters for the auction
/// @dev token and totalSupply are passed as constructor arguments
struct AuctionParameters {
    address currency; // token to raise funds in. Use address(0) for ETH
    address tokensRecipient; // address to receive leftover tokens
    address fundsRecipient; // address to receive all raised funds
    uint64 startBlock; // Block which the first step starts
    uint64 endBlock; // When the auction finishes
    uint64 claimBlock; // Block when the auction can claimed
    uint256 tickSpacing; // Fixed Q96 granularity for prices
    address validationHook; // Optional hook called before a bid
    uint256 floorPrice; // Starting Q96 floor price for the auction
    uint128 requiredCurrencyRaised; // Amount of currency required to be raised for the auction to graduate
    bytes auctionStepsData; // Packed bytes describing token issuance schedule
}

/// @notice Interface for the ContinuousClearingAuction contract
interface IContinuousClearingAuction is
    ILBPInitializer,
    ICheckpointStorage,
    ITickStorage,
    IStepStorage,
    IAuctionStorage,
    IBidStorage
{
    /// @notice Error thrown when the amount received is invalid
    error InvalidTokenAmountReceived();
    /// @notice Error thrown when an unauthorized caller tries to access restricted functions
    error NotAuthorized(address authorized, address caller);
    /// @notice Error thrown when an invalid value is deposited
    error InvalidAmount();
    /// @notice Error thrown when the bid owner is the zero address
    error BidOwnerCannotBeZeroAddress();
    /// @notice Error thrown when the bid Q96 price is below the clearing price
    error BidMustBeAboveClearingPrice();
    /// @notice Error thrown when the bid Q96 price is too high given the auction's total supply
    /// @param maxPriceQ96 The Q96 price of the bid
    /// @param maxBidPriceQ96 The max Q96 price allowed for a bid
    error InvalidBidPriceTooHigh(uint256 maxPriceQ96, uint256 maxBidPriceQ96);
    /// @notice Error thrown when the bid amount is too small
    error BidAmountTooSmall();
    /// @notice Error thrown when msg.value is non zero when currency is not ETH
    error CurrencyIsNotNative();
    /// @notice Error thrown when the auction is not started
    error AuctionNotStarted();
    /// @notice Error thrown when the tokens required for the auction have not been received
    error TokensNotReceived();
    /// @notice Error thrown when the floor price plus tick spacing is greater than the maximum bid price
    error FloorPriceAndTickSpacingGreaterThanMaxBidPrice(uint256 nextTickQ96, uint256 maxBidPriceQ96);
    /// @notice Error thrown when the floor price plus tick spacing would overflow a uint256
    error FloorPriceAndTickSpacingTooLarge();
    /// @notice Error thrown when the bid has already been exited
    error BidAlreadyExited();
    /// @notice Error thrown when the bid is higher than the clearing Q96 price
    error CannotExitBid();
    /// @notice Error thrown when the bid cannot be partially exited before the end block
    error CannotPartiallyExitBidBeforeEndBlock();
    /// @notice Error thrown when the last fully filled checkpoint hint is invalid
    error InvalidLastFullyFilledCheckpointHint();
    /// @notice Error thrown when the outbid block checkpoint hint is invalid
    error InvalidOutbidBlockCheckpointHint();
    /// @notice Error thrown when the bids are not owned by the same owner
    error BatchClaimDifferentOwner(address expectedOwner, address receivedOwner);
    /// @notice Error thrown when the bid has not been exited
    error BidNotExited();
    /// @notice Error thrown when the bid cannot be partially exited before the auction has graduated
    error CannotPartiallyExitBidBeforeGraduation();
    /// @notice Error thrown when the token transfer fails
    error TokenTransferFailed();
    /// @notice Error thrown when the end block is not checkpointed
    error AuctionIsNotFinalized();
    /// @notice Error thrown when the bid is too large
    error InvalidBidUnableToClear();
    /// @notice Error thrown when the auction has sold the entire total supply of tokens
    error AuctionSoldOut();
    /// @notice Error thrown when the tick price is not greater than the next active tick Q96 price
    error TickHintMustBeGreaterThanNextActiveTickPrice(uint256 tickPriceQ96, uint256 nextActiveTickPriceQ96);
    /// @notice Error thrown when force iteration is attempted after this block's checkpoint already exists
    error CheckpointAlreadyExistsForBlock();

    /// @notice Emitted when the tokens are received
    /// @param totalSupply The total supply of tokens received
    event TokensReceived(uint128 totalSupply);

    /// @notice Emitted when a bid is submitted
    /// @param id The id of the bid
    /// @param owner The owner of the bid
    /// @param priceQ96 The Q96 price of the bid
    /// @param amount The amount of the bid
    event BidSubmitted(uint256 indexed id, address indexed owner, uint256 priceQ96, uint128 amount);

    /// @notice Emitted when a new checkpoint is created
    /// @param blockNumber The block number of the checkpoint
    /// @param clearingPriceQ96 The Q96 clearing price of the checkpoint
    /// @param cumulativeMps The cumulative percentage of total tokens allocated across all previous steps, represented in ten-millionths of the total supply (1e7 = 100%)
    event CheckpointUpdated(uint256 blockNumber, uint256 clearingPriceQ96, uint24 cumulativeMps);

    /// @notice Emitted when the clearing price is updated
    /// @param blockNumber The block number when the clearing price was updated
    /// @param clearingPriceQ96 The new Q96 clearing price
    event ClearingPriceUpdated(uint256 blockNumber, uint256 clearingPriceQ96);

    /// @notice Emitted when a bid is exited
    /// @param bidId The id of the bid
    /// @param owner The owner of the bid
    /// @param tokensFilled The amount of tokens filled
    /// @param currencyRefunded The amount of currency refunded
    event BidExited(uint256 indexed bidId, address indexed owner, uint256 tokensFilled, uint256 currencyRefunded);

    /// @notice Emitted when a bid is claimed
    /// @param bidId The id of the bid
    /// @param owner The owner of the bid
    /// @param tokensFilled The amount of tokens claimed
    event TokensClaimed(uint256 indexed bidId, address indexed owner, uint256 tokensFilled);

    /// @notice Submit a new bid
    /// @param maxPriceQ96 The maximum Q96 price the bidder is willing to pay
    /// @param amount The amount of the bid
    /// @param owner The owner of the bid
    /// @param prevTickPriceQ96 The Q96 price of the previous tick
    /// @param hookData Additional data to pass to the hook required for validation
    /// @return bidId The id of the bid
    function submitBid(
        uint256 maxPriceQ96,
        uint128 amount,
        address owner,
        uint256 prevTickPriceQ96,
        bytes calldata hookData
    ) external payable returns (uint256 bidId);

    /// @notice Submit a new bid without specifying the previous tick price
    /// @dev It is NOT recommended to use this function unless you are sure that `maxPriceQ96` is already initialized
    ///      as this function will iterate through every tick starting from the floor price if it is not.
    /// @param maxPriceQ96 The maximum Q96 price the bidder is willing to pay
    /// @param amount The amount of the bid
    /// @param owner The owner of the bid
    /// @param hookData Additional data to pass to the hook required for validation
    /// @return bidId The id of the bid
    function submitBid(uint256 maxPriceQ96, uint128 amount, address owner, bytes calldata hookData)
        external
        payable
        returns (uint256 bidId);

    /// @notice Register a new checkpoint
    /// @dev This function is called every time a new bid is submitted above the current clearing price
    /// @dev If the auction is over, it returns the final checkpoint
    /// @return _checkpoint The checkpoint at the current block
    function checkpoint() external returns (Checkpoint memory _checkpoint);

    /// @notice Get the most up to date clearing price
    /// @dev This will be at least as up to date as the latest checkpoint. It can be incremented from calls to `forceIterateOverTicks`
    /// @dev Callers MUST ensure that the latest checkpoint is up to date before using this function.
    /// @dev Additionally, it is recommended to use this function instead of reading the clearingPrice from the latest checkpoint.
    /// @return The current clearing price in Q96 form
    function clearingPrice() external view returns (uint256);

    /// @notice Whether the auction has graduated as of the given checkpoint
    /// @dev The auction is considered graduated if the currency raised is greater than or equal to the required currency raised
    /// @dev Relies on the latest checkpoint which may be out of date
    /// @return bool True if the auction has graduated, false otherwise
    function isGraduated() external view returns (bool);

    /// @notice Exit a bid
    /// @dev This function can only be used for bids where the max price is above the final clearing price after the auction has ended
    /// @param bidId The id of the bid
    function exitBid(uint256 bidId) external;

    /// @notice Exit a bid which has been partially filled
    /// @dev This function can be used only for partially filled bids. For fully filled bids, `exitBid` must be used
    /// @param bidId The id of the bid
    /// @param lastFullyFilledCheckpointBlock The last checkpointed block where the clearing price is strictly < bid.maxPrice
    /// @param outbidBlock The first checkpointed block where the clearing price is strictly > bid.maxPrice, or 0 if the bid is partially filled at the end of the auction
    function exitPartiallyFilledBid(uint256 bidId, uint64 lastFullyFilledCheckpointBlock, uint64 outbidBlock) external;

    /// @notice Claim tokens after the auction's claim block
    /// @notice The bid must be exited before claiming tokens
    /// @dev Anyone can claim tokens for any bid, the tokens are transferred to the bid owner
    /// @param bidId The id of the bid
    function claimTokens(uint256 bidId) external;

    /// @notice Claim tokens for multiple bids
    /// @dev Anyone can claim tokens for bids of the same owner, the tokens are transferred to the owner
    /// @dev A TokensClaimed event is emitted for each bid but only one token transfer will be made
    /// @param owner The owner of the bids
    /// @param bidIds The ids of the bids
    function claimTokensBatch(address owner, uint256[] calldata bidIds) external;

    /// @notice Withdraw all of the currency raised
    /// @dev This function can only be called after the auction has ended
    /// @dev Can only be called by the funds recipient
    function sweepCurrency() external;

    /// @notice Implements IERC165.supportsInterface to signal support for the ILBPInitializer interface
    /// @param interfaceId The interface identifier to check
    function supportsInterface(bytes4 interfaceId) external view override(IERC165) returns (bool);

    /// @notice The currency being raised in the auction
    function currency() external view returns (address);

    /// @notice The token being sold in the auction
    function token() external view returns (address);

    /// @notice The total supply of tokens to sell
    function totalSupply() external view returns (uint128);

    /// @notice The recipient of any unsold tokens at the end of the auction
    function tokensRecipient() external view returns (address);

    /// @notice The recipient of the raised currency from the auction
    function fundsRecipient() external view returns (address);

    /// @notice The block at which the auction starts
    /// @return The starting block number
    function startBlock() external view override(ILBPInitializer) returns (uint64);

    /// @notice The block at which the auction ends
    /// @return The ending block number
    function endBlock() external view override(ILBPInitializer) returns (uint64);

    /// @notice The block at which the auction can be claimed
    function claimBlock() external view returns (uint64);

    /// @notice The address of the validation hook for the auction
    function validationHook() external view returns (IValidationHook);

    /// @notice Sweep any unsold tokens to the tokens recipient
    /// @dev This function can only be called after the auction has ended
    /// @dev Can only be called by the tokens recipient
    function sweepUnsoldTokens() external;

    /// @notice The required demand to move the auction to a given price, in Q96 representation
    /// @dev Relies on the latest checkpoint which may be out of date
    function requiredDemandQ96(uint256 _priceQ96) external view returns (uint256);

    /// @notice The required demand to move the auction to the next active tick, in Q96 representation
    /// @dev Relies on the latest checkpoint which may be out of date
    /// @dev Returns zero when there is no next active tick
    function requiredDemandQ96AtNextActiveTick() external view returns (uint256);
}

// src/periphery/validationHooks/SingletonGatedERC1155ValidationHook.sol

interface ISingletonGatedERC1155ValidationHook is IValidationHookIntrospection, IERC1155ValidationErrors {
    /// @notice Gate settings for one auction
    /// @param tokenId The ERC1155 tokenId (ZKPassport policyId) that bidders must hold
    /// @param expirationBlock The block number until which the check is enforced
    /// @param registered True after `register` is called for the auction
    struct AuctionConfig {
        uint256 tokenId;
        uint64 expirationBlock;
        bool registered;
    }

    /// @notice Error thrown when `validate` is called by an auction that is not registered
    error AuctionNotRegistered(address auction);
    /// @notice Error thrown when the auction already has a config
    error AlreadyRegistered(address auction);
    /// @notice Error thrown when a deployed auction does not use this hook
    error AuctionValidationHookMismatch(address auction);
    /// @notice Error thrown when the auction has started
    error AuctionAlreadyStarted(address auction);
    /// @notice Error thrown when `expirationBlock` is at or before the current block
    error ExpirationBlockNotInFuture(uint64 expirationBlock);

    /// @notice Emitted when an auction is registered
    /// @param auction The auction that was registered
    /// @param registrant The account that registered the auction
    /// @param tokenId The ERC1155 tokenId (ZKPassport policyId) that bidders must hold
    /// @param expirationBlock The block number until which the check is enforced
    event AuctionRegistered(
        address indexed auction, address indexed registrant, uint256 tokenId, uint64 expirationBlock
    );

    /// @notice The ERC1155 contract that is checked for ownership (ZKPassport credentials registry)
    function erc1155() external view returns (IERC1155);

    /// @notice The gate settings for `auction`
    function configOf(address auction) external view returns (AuctionConfig memory);

    /// @notice Set the gate settings for `auction`. Permissionless, first write wins, and immutable after.
    /// @dev Register before calling `ContinuousClearingAuctionFactory.create`. Squatting a predicted address is an
    ///      accepted risk. After registering, read `configOf(auction)` and confirm it matches your `tokenId` and
    ///      `expirationBlock` before calling `factory.create`. If it does not match, the registration was front-run:
    ///      use a new salt.
    ///      The `startBlock` check applies only to auctions that are already deployed. Those auctions must use this
    ///      hook (`validationHook() == address(this)`) and registration reverts at or after `startBlock`.
    /// @param auction The auction address. It may be a predicted address with no code.
    /// @param tokenId The ERC1155 tokenId (ZKPassport policyId) that bidders must hold
    /// @param expirationBlock The block until which the check is enforced. Must be after the current block.
    function register(address auction, uint256 tokenId, uint64 expirationBlock) external;
}

/// @notice One validation hook for many auctions. Each auction has its own ZKPassport policyId (ERC1155 tokenId)
///         and expiration block. Until the expiration block, bidders must hold the credential and bid for themselves.
/// @dev The auction calls `validate`, so the config is read for `msg.sender`. An unregistered auction cannot take bids.
///      Credential expiry is handled by the registry: `balanceOf` returns 0 for an expired credential.
///      This hook does not claim the `IBaseERC1155ValidationHook` or `IGatedERC1155ValidationHook` interface IDs.
contract SingletonGatedERC1155ValidationHook is
    ISingletonGatedERC1155ValidationHook,
    ValidationHookIntrospection,
    BlockNumberish
{
    /// @inheritdoc ISingletonGatedERC1155ValidationHook
    IERC1155 public immutable erc1155;

    mapping(address auction => AuctionConfig) private _configOf;

    /// @param _erc1155 The ERC1155 registry checked for credential ownership
    constructor(address _erc1155) {
        if (_erc1155 == address(0)) revert InvalidTokenAddress();
        erc1155 = IERC1155(_erc1155);
    }

    /// @inheritdoc ISingletonGatedERC1155ValidationHook
    function configOf(address auction) external view returns (AuctionConfig memory) {
        return _configOf[auction];
    }

    /// @inheritdoc ISingletonGatedERC1155ValidationHook
    function register(address auction, uint256 tokenId, uint64 expirationBlock) external {
        if (_configOf[auction].registered) revert AlreadyRegistered(auction);
        if (expirationBlock <= _getBlockNumberish()) revert ExpirationBlockNotInFuture(expirationBlock);
        // Deployed auctions only. Predicted addresses have no code and are registered before `factory.create`.
        if (auction.code.length > 0) {
            if (address(IContinuousClearingAuction(auction).validationHook()) != address(this)) {
                revert AuctionValidationHookMismatch(auction);
            }
            if (_getBlockNumberish() >= IContinuousClearingAuction(auction).startBlock()) {
                revert AuctionAlreadyStarted(auction);
            }
        }
        _configOf[auction] = AuctionConfig(tokenId, expirationBlock, true);
        emit AuctionRegistered(auction, msg.sender, tokenId, expirationBlock);
    }

    /// @notice Require that the bid `owner` is the `sender` and holds the auction's ERC1155 tokenId
    /// @dev The check is enforced until the auction's `expirationBlock`
    /// @inheritdoc IValidationHook
    function validate(uint256, uint128, address owner, address sender, bytes calldata) external view {
        AuctionConfig memory config = _configOf[msg.sender];
        if (!config.registered) revert AuctionNotRegistered(msg.sender);
        if (_getBlockNumberish() >= config.expirationBlock) return;
        if (sender != owner) revert SenderMustBeOwner();
        if (erc1155.balanceOf(owner, config.tokenId) == 0) revert NotOwnerOfERC1155Token(config.tokenId);
    }

    /// @dev Extend the existing introspection support with ISingletonGatedERC1155ValidationHook.
    ///      `IBaseERC1155ValidationHook` and `IGatedERC1155ValidationHook` are intentionally not claimed.
    function supportsInterface(bytes4 _interfaceId)
        public
        view
        override(ValidationHookIntrospection, IERC165)
        returns (bool)
    {
        return super.supportsInterface(_interfaceId)
            || _interfaceId == type(ISingletonGatedERC1155ValidationHook).interfaceId;
    }
}
