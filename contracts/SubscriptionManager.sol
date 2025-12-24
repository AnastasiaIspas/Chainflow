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

    constructor(address planRegistryAddress) {
        planRegistry = IPlanRegistry(planRegistryAddress);
    }

    modifier validActivePlan(uint256 planId) {
        (, , , , bool active) = planRegistry.getPlan(planId);
        require(active, "Plan inactive");
        _;
    }

    function subscribe(uint256 planId) external payable validActivePlan(planId) {
        (, uint256 priceWei, uint256 intervalSec, address merchant, ) = planRegistry.getPlan(planId);

        Subscription storage s = subscriptions[msg.sender][planId];
        require(!s.active, "Already subscribed");
        require(msg.value == priceWei, "Wrong amount");

        uint256 nextPay = block.timestamp + intervalSec;
        s.nextPaymentAt = nextPay;
        s.active = true;

        (bool ok, ) = merchant.call{value: msg.value}("");
        require(ok, "ETH transfer failed");

        emit SubscriptionActivated(msg.sender, planId, nextPay);
        emit PaymentExecuted(msg.sender, planId, block.timestamp, nextPay, msg.value);
    }

    function pay(uint256 planId) external payable validActivePlan(planId) {
        (, uint256 priceWei, uint256 intervalSec, address merchant, ) = planRegistry.getPlan(planId);

        Subscription storage s = subscriptions[msg.sender][planId];
        require(s.active, "Not subscribed");
        require(block.timestamp >= s.nextPaymentAt, "Too early");
        require(msg.value == priceWei, "Wrong amount");

        uint256 paidAt = block.timestamp;
        uint256 nextPay = paidAt + intervalSec;
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
        Subscription memory s = subscriptions[user][planId];
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
}
