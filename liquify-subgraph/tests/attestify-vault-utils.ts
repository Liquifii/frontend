import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  Deposited,
  Initialized,
  LimitsUpdated,
  OwnershipTransferred,
  Paused,
  Rebalanced,
  StrategyUpdated,
  Unpaused,
  Upgraded,
  Withdrawn
} from "../generated/AttestifyVault/AttestifyVault"

export function createDepositedEvent(
  user: Address,
  assets: BigInt,
  shares: BigInt
): Deposited {
  let depositedEvent = changetype<Deposited>(newMockEvent())

  depositedEvent.parameters = new Array()

  depositedEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  depositedEvent.parameters.push(
    new ethereum.EventParam("assets", ethereum.Value.fromUnsignedBigInt(assets))
  )
  depositedEvent.parameters.push(
    new ethereum.EventParam("shares", ethereum.Value.fromUnsignedBigInt(shares))
  )

  return depositedEvent
}

export function createInitializedEvent(version: BigInt): Initialized {
  let initializedEvent = changetype<Initialized>(newMockEvent())

  initializedEvent.parameters = new Array()

  initializedEvent.parameters.push(
    new ethereum.EventParam(
      "version",
      ethereum.Value.fromUnsignedBigInt(version)
    )
  )

  return initializedEvent
}

export function createLimitsUpdatedEvent(
  maxUser: BigInt,
  maxTotal: BigInt
): LimitsUpdated {
  let limitsUpdatedEvent = changetype<LimitsUpdated>(newMockEvent())

  limitsUpdatedEvent.parameters = new Array()

  limitsUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "maxUser",
      ethereum.Value.fromUnsignedBigInt(maxUser)
    )
  )
  limitsUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "maxTotal",
      ethereum.Value.fromUnsignedBigInt(maxTotal)
    )
  )

  return limitsUpdatedEvent
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent =
    changetype<OwnershipTransferred>(newMockEvent())

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createPausedEvent(account: Address): Paused {
  let pausedEvent = changetype<Paused>(newMockEvent())

  pausedEvent.parameters = new Array()

  pausedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )

  return pausedEvent
}

export function createRebalancedEvent(
  strategyBalance: BigInt,
  reserveBalance: BigInt,
  timestamp: BigInt
): Rebalanced {
  let rebalancedEvent = changetype<Rebalanced>(newMockEvent())

  rebalancedEvent.parameters = new Array()

  rebalancedEvent.parameters.push(
    new ethereum.EventParam(
      "strategyBalance",
      ethereum.Value.fromUnsignedBigInt(strategyBalance)
    )
  )
  rebalancedEvent.parameters.push(
    new ethereum.EventParam(
      "reserveBalance",
      ethereum.Value.fromUnsignedBigInt(reserveBalance)
    )
  )
  rebalancedEvent.parameters.push(
    new ethereum.EventParam(
      "timestamp",
      ethereum.Value.fromUnsignedBigInt(timestamp)
    )
  )

  return rebalancedEvent
}

export function createStrategyUpdatedEvent(
  oldStrategy: Address,
  newStrategy: Address
): StrategyUpdated {
  let strategyUpdatedEvent = changetype<StrategyUpdated>(newMockEvent())

  strategyUpdatedEvent.parameters = new Array()

  strategyUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "oldStrategy",
      ethereum.Value.fromAddress(oldStrategy)
    )
  )
  strategyUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "newStrategy",
      ethereum.Value.fromAddress(newStrategy)
    )
  )

  return strategyUpdatedEvent
}

export function createUnpausedEvent(account: Address): Unpaused {
  let unpausedEvent = changetype<Unpaused>(newMockEvent())

  unpausedEvent.parameters = new Array()

  unpausedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )

  return unpausedEvent
}

export function createUpgradedEvent(implementation: Address): Upgraded {
  let upgradedEvent = changetype<Upgraded>(newMockEvent())

  upgradedEvent.parameters = new Array()

  upgradedEvent.parameters.push(
    new ethereum.EventParam(
      "implementation",
      ethereum.Value.fromAddress(implementation)
    )
  )

  return upgradedEvent
}

export function createWithdrawnEvent(
  user: Address,
  assets: BigInt,
  shares: BigInt
): Withdrawn {
  let withdrawnEvent = changetype<Withdrawn>(newMockEvent())

  withdrawnEvent.parameters = new Array()

  withdrawnEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  withdrawnEvent.parameters.push(
    new ethereum.EventParam("assets", ethereum.Value.fromUnsignedBigInt(assets))
  )
  withdrawnEvent.parameters.push(
    new ethereum.EventParam("shares", ethereum.Value.fromUnsignedBigInt(shares))
  )

  return withdrawnEvent
}
