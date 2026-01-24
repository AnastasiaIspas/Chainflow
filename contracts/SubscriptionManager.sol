// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IPlanRegistry {
    function getPlan(uint256 planId)
        external
        view
        returns (string memory name, uint256 priceWei, uint256 intervalSec, address merchant, bool active);
}

contract SubscriptionManager {
    IPlanRegistry public planRegistry;
    address public owner;
    bool public paused;

    struct Subscription {
        uint256 nextPaymentAt; 
        bool active;           
    }

    // user => planId => subscription
    mapping(address => mapping(uint256 => Subscription)) public subscriptions;

    event SubscriptionActivated(address indexed user, uint256 indexed planId, uint256 nextPaymentAt);
    event PaymentExecuted(address indexed user, uint256 indexed planId, uint256 paidAt, uint256 nextPaymentAt, uint256 amountWei);
    event SubscriptionCancelled(address indexed user, uint256 indexed planId);
    event SubscriptionExpired(address indexed user, uint256 indexed planId);
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    constructor(address planRegistryAddress) {
        planRegistry = IPlanRegistry(planRegistryAddress);
        owner = msg.sender;
        paused = false;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier validActivePlan(uint256 planId) {
        (, , , , bool active) = planRegistry.getPlan(planId);
        require(active, "Plan inactive");
        _;
    }

    // Pure function: calculates next payment timestamp
    function calculateNextPayment(uint256 currentTimestamp, uint256 intervalSec) 
        public pure returns (uint256) 
    {
        return currentTimestamp + intervalSec;
    }

    function subscribe(uint256 planId) external payable validActivePlan(planId) whenNotPaused {
        (, uint256 priceWei, uint256 intervalSec, address merchant, ) = planRegistry.getPlan(planId);

        Subscription storage s = subscriptions[msg.sender][planId];
        require(!s.active, "Already subscribed");
        require(msg.value == priceWei, "Wrong amount");

        uint256 nextPay = calculateNextPayment(block.timestamp, intervalSec);
        s.nextPaymentAt = nextPay;
        s.active = true;

        (bool ok, ) = merchant.call{value: msg.value}("");
        require(ok, "ETH transfer failed");

        emit SubscriptionActivated(msg.sender, planId, nextPay);
        emit PaymentExecuted(msg.sender, planId, block.timestamp, nextPay, msg.value);
    }

    function pay(uint256 planId) external payable validActivePlan(planId) whenNotPaused {
        (, uint256 priceWei, uint256 intervalSec, address merchant, ) = planRegistry.getPlan(planId);

        Subscription storage s = subscriptions[msg.sender][planId];
        require(s.active, "Not subscribed");
        require(block.timestamp >= s.nextPaymentAt, "Too early");
        require(msg.value == priceWei, "Wrong amount");

        uint256 paidAt = block.timestamp;
        uint256 nextPay = calculateNextPayment(paidAt, intervalSec);
        s.nextPaymentAt = nextPay;

        (bool ok, ) = merchant.call{value: msg.value}("");
        require(ok, "ETH transfer failed");

        emit PaymentExecuted(msg.sender, planId, paidAt, nextPay, msg.value);
    }

    function cancel(uint256 planId) external {
        Subscription storage s = subscriptions[msg.sender][planId];
        require(s.active, "Not subscribed");
        s.active = false;
        emit SubscriptionCancelled(msg.sender, planId);
    }

    function isExpired(address user, uint256 planId) public view returns (bool) {
        Subscription storage s = subscriptions[user][planId];
        if (!s.active) return false;

        (, , uint256 intervalSec, , ) = planRegistry.getPlan(planId);
        return block.timestamp > (s.nextPaymentAt + intervalSec);
    }

    function markExpired(uint256 planId) external {
        Subscription storage s = subscriptions[msg.sender][planId];
        require(s.active, "Not subscribed");
        require(isExpired(msg.sender, planId), "Not expired");
        s.active = false;
        emit SubscriptionExpired(msg.sender, planId);
    }

    // Admin functions (only owner)
    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    function setPlanRegistry(address newAddress) external onlyOwner {
        require(newAddress != address(0), "Invalid address");
        planRegistry = IPlanRegistry(newAddress);
    }

    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");
        payable(owner).transfer(balance);
    }
}
