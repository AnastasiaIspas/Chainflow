// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract PlanRegistry {
    struct Plan {
        string name;
        uint256 priceWei;
        uint256 intervalSec;
        address merchant;
        bool active;
    }

    Plan[] private plans;

    event PlanCreated(uint256 indexed planId, address indexed merchant, string name, uint256 priceWei, uint256 intervalSec);
    event PlanStatusChanged(uint256 indexed planId, bool active);

    function createPlan(string calldata name, uint256 priceWei, uint256 intervalSec) external returns (uint256 planId) {
        require(priceWei > 0, "Price must be > 0");
        require(intervalSec > 0, "Interval must be > 0");

        plans.push(Plan({
            name: name,
            priceWei: priceWei,
            intervalSec: intervalSec,
            merchant: msg.sender,
            active: true
        }));

        planId = plans.length - 1;
        emit PlanCreated(planId, msg.sender, name, priceWei, intervalSec);
    }

    function setPlanActive(uint256 planId, bool active) external {
        require(planId < plans.length, "Invalid planId");
        require(plans[planId].merchant == msg.sender, "Only merchant");
        plans[planId].active = active;
        emit PlanStatusChanged(planId, active);
    }

    function getPlan(uint256 planId)
        external
        view
        returns (string memory name, uint256 priceWei, uint256 intervalSec, address merchant, bool active)
    {
        require(planId < plans.length, "Invalid planId");
        Plan memory p = plans[planId];
        return (p.name, p.priceWei, p.intervalSec, p.merchant, p.active);
    }

    function plansCount() external view returns (uint256) {
        return plans.length;
    }
}
