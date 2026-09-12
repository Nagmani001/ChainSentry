import { Burn as BurnEvent, Collect as CollectEvent, CollectProtocol as CollectProtocolEvent, Flash as FlashEvent, IncreaseObservationCardinalityNext as IncreaseObservationCardinalityNextEvent, Initialize as InitializeEvent, Mint as MintEvent, SetFeeProtocol as SetFeeProtocolEvent, Swap as SwapEvent } from "../generated/UniswapV3Pool/UniswapV3Pool"
import { Burn, Collect, CollectProtocol, Flash, IncreaseObservationCardinalityNext, Initialize, Mint, SetFeeProtocol, Swap, ChainSentryEvent } from "../generated/schema"

function jsonPair(name: string, value: string): string {
  return '"' + name + '":"' + value + '"'
}

export function handleBurn(event: BurnEvent): void {
  let entity = new Burn(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.owner = event.params.owner
  entity.tickLower = event.params.tickLower
  entity.tickUpper = event.params.tickUpper
  entity.amount = event.params.amount
  entity.amount0 = event.params.amount0
  entity.amount1 = event.params.amount1
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()

  let normalized = new ChainSentryEvent(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  normalized.contractAddress = event.address
  normalized.blockNumber = event.block.number
  normalized.blockTimestamp = event.block.timestamp
  normalized.transactionHash = event.transaction.hash
  normalized.transactionIndex = event.transaction.index
  normalized.logIndex = event.logIndex
  normalized.eventName = "Burn"
  normalized.eventSignature = "Burn(address,int24,int24,uint128,uint256,uint256)"
  normalized.topic0 = "0x0c396cd989a39f4459b5fa1aed6a9a8dcdbc45908acfd67e028cd568da98982c"
  normalized.args = "{" + jsonPair("owner", event.params.owner.toHexString()) + "," + jsonPair("tickLower", event.params.tickLower.toString()) + "," + jsonPair("tickUpper", event.params.tickUpper.toString()) + "," + jsonPair("amount", event.params.amount.toString()) + "," + jsonPair("amount0", event.params.amount0.toString()) + "," + jsonPair("amount1", event.params.amount1.toString()) + "}"
  normalized.from = event.transaction.from
  normalized.to = event.transaction.to
  normalized.value = event.transaction.value
  normalized.gasPrice = event.transaction.gasPrice
  normalized.gasLimit = event.transaction.gasLimit
  normalized.input = event.transaction.input
  normalized.save()
}

export function handleCollect(event: CollectEvent): void {
  let entity = new Collect(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.owner = event.params.owner
  entity.recipient = event.params.recipient
  entity.tickLower = event.params.tickLower
  entity.tickUpper = event.params.tickUpper
  entity.amount0 = event.params.amount0
  entity.amount1 = event.params.amount1
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()

  let normalized = new ChainSentryEvent(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  normalized.contractAddress = event.address
  normalized.blockNumber = event.block.number
  normalized.blockTimestamp = event.block.timestamp
  normalized.transactionHash = event.transaction.hash
  normalized.transactionIndex = event.transaction.index
  normalized.logIndex = event.logIndex
  normalized.eventName = "Collect"
  normalized.eventSignature = "Collect(address,address,int24,int24,uint128,uint128)"
  normalized.topic0 = "0x70935338e69775456a85ddef226c395fb668b63fa0115f5f20610b388e6ca9c0"
  normalized.args = "{" + jsonPair("owner", event.params.owner.toHexString()) + "," + jsonPair("recipient", event.params.recipient.toHexString()) + "," + jsonPair("tickLower", event.params.tickLower.toString()) + "," + jsonPair("tickUpper", event.params.tickUpper.toString()) + "," + jsonPair("amount0", event.params.amount0.toString()) + "," + jsonPair("amount1", event.params.amount1.toString()) + "}"
  normalized.from = event.transaction.from
  normalized.to = event.transaction.to
  normalized.value = event.transaction.value
  normalized.gasPrice = event.transaction.gasPrice
  normalized.gasLimit = event.transaction.gasLimit
  normalized.input = event.transaction.input
  normalized.save()
}

export function handleCollectProtocol(event: CollectProtocolEvent): void {
  let entity = new CollectProtocol(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.sender = event.params.sender
  entity.recipient = event.params.recipient
  entity.amount0 = event.params.amount0
  entity.amount1 = event.params.amount1
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()

  let normalized = new ChainSentryEvent(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  normalized.contractAddress = event.address
  normalized.blockNumber = event.block.number
  normalized.blockTimestamp = event.block.timestamp
  normalized.transactionHash = event.transaction.hash
  normalized.transactionIndex = event.transaction.index
  normalized.logIndex = event.logIndex
  normalized.eventName = "CollectProtocol"
  normalized.eventSignature = "CollectProtocol(address,address,uint128,uint128)"
  normalized.topic0 = "0x596b573906218d3411850b26a6b437d6c4522fdb43d2d2386263f86d50b8b151"
  normalized.args = "{" + jsonPair("sender", event.params.sender.toHexString()) + "," + jsonPair("recipient", event.params.recipient.toHexString()) + "," + jsonPair("amount0", event.params.amount0.toString()) + "," + jsonPair("amount1", event.params.amount1.toString()) + "}"
  normalized.from = event.transaction.from
  normalized.to = event.transaction.to
  normalized.value = event.transaction.value
  normalized.gasPrice = event.transaction.gasPrice
  normalized.gasLimit = event.transaction.gasLimit
  normalized.input = event.transaction.input
  normalized.save()
}

export function handleFlash(event: FlashEvent): void {
  let entity = new Flash(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.sender = event.params.sender
  entity.recipient = event.params.recipient
  entity.amount0 = event.params.amount0
  entity.amount1 = event.params.amount1
  entity.paid0 = event.params.paid0
  entity.paid1 = event.params.paid1
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()

  let normalized = new ChainSentryEvent(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  normalized.contractAddress = event.address
  normalized.blockNumber = event.block.number
  normalized.blockTimestamp = event.block.timestamp
  normalized.transactionHash = event.transaction.hash
  normalized.transactionIndex = event.transaction.index
  normalized.logIndex = event.logIndex
  normalized.eventName = "Flash"
  normalized.eventSignature = "Flash(address,address,uint256,uint256,uint256,uint256)"
  normalized.topic0 = "0xbdbdb71d7860376ba52b25a5028beea23581364a40522f6bcfb86bb1f2dca633"
  normalized.args = "{" + jsonPair("sender", event.params.sender.toHexString()) + "," + jsonPair("recipient", event.params.recipient.toHexString()) + "," + jsonPair("amount0", event.params.amount0.toString()) + "," + jsonPair("amount1", event.params.amount1.toString()) + "," + jsonPair("paid0", event.params.paid0.toString()) + "," + jsonPair("paid1", event.params.paid1.toString()) + "}"
  normalized.from = event.transaction.from
  normalized.to = event.transaction.to
  normalized.value = event.transaction.value
  normalized.gasPrice = event.transaction.gasPrice
  normalized.gasLimit = event.transaction.gasLimit
  normalized.input = event.transaction.input
  normalized.save()
}

export function handleIncreaseObservationCardinalityNext(event: IncreaseObservationCardinalityNextEvent): void {
  let entity = new IncreaseObservationCardinalityNext(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.observationCardinalityNextOld = event.params.observationCardinalityNextOld
  entity.observationCardinalityNextNew = event.params.observationCardinalityNextNew
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()

  let normalized = new ChainSentryEvent(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  normalized.contractAddress = event.address
  normalized.blockNumber = event.block.number
  normalized.blockTimestamp = event.block.timestamp
  normalized.transactionHash = event.transaction.hash
  normalized.transactionIndex = event.transaction.index
  normalized.logIndex = event.logIndex
  normalized.eventName = "IncreaseObservationCardinalityNext"
  normalized.eventSignature = "IncreaseObservationCardinalityNext(uint16,uint16)"
  normalized.topic0 = "0xac49e518f90a358f652e4400164f05a5d8f7e35e7747279bc3a93dbf584e125a"
  normalized.args = "{" + jsonPair("observationCardinalityNextOld", event.params.observationCardinalityNextOld.toString()) + "," + jsonPair("observationCardinalityNextNew", event.params.observationCardinalityNextNew.toString()) + "}"
  normalized.from = event.transaction.from
  normalized.to = event.transaction.to
  normalized.value = event.transaction.value
  normalized.gasPrice = event.transaction.gasPrice
  normalized.gasLimit = event.transaction.gasLimit
  normalized.input = event.transaction.input
  normalized.save()
}

export function handleInitialize(event: InitializeEvent): void {
  let entity = new Initialize(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.sqrtPriceX96 = event.params.sqrtPriceX96
  entity.tick = event.params.tick
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()

  let normalized = new ChainSentryEvent(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  normalized.contractAddress = event.address
  normalized.blockNumber = event.block.number
  normalized.blockTimestamp = event.block.timestamp
  normalized.transactionHash = event.transaction.hash
  normalized.transactionIndex = event.transaction.index
  normalized.logIndex = event.logIndex
  normalized.eventName = "Initialize"
  normalized.eventSignature = "Initialize(uint160,int24)"
  normalized.topic0 = "0x98636036cb66a9c19a37435efc1e90142190214e8abeb821bdba3f2990dd4c95"
  normalized.args = "{" + jsonPair("sqrtPriceX96", event.params.sqrtPriceX96.toString()) + "," + jsonPair("tick", event.params.tick.toString()) + "}"
  normalized.from = event.transaction.from
  normalized.to = event.transaction.to
  normalized.value = event.transaction.value
  normalized.gasPrice = event.transaction.gasPrice
  normalized.gasLimit = event.transaction.gasLimit
  normalized.input = event.transaction.input
  normalized.save()
}

export function handleMint(event: MintEvent): void {
  let entity = new Mint(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.sender = event.params.sender
  entity.owner = event.params.owner
  entity.tickLower = event.params.tickLower
  entity.tickUpper = event.params.tickUpper
  entity.amount = event.params.amount
  entity.amount0 = event.params.amount0
  entity.amount1 = event.params.amount1
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()

  let normalized = new ChainSentryEvent(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  normalized.contractAddress = event.address
  normalized.blockNumber = event.block.number
  normalized.blockTimestamp = event.block.timestamp
  normalized.transactionHash = event.transaction.hash
  normalized.transactionIndex = event.transaction.index
  normalized.logIndex = event.logIndex
  normalized.eventName = "Mint"
  normalized.eventSignature = "Mint(address,address,int24,int24,uint128,uint256,uint256)"
  normalized.topic0 = "0x7a53080ba414158be7ec69b987b5fb7d07dee101fe85488f0853ae16239d0bde"
  normalized.args = "{" + jsonPair("sender", event.params.sender.toHexString()) + "," + jsonPair("owner", event.params.owner.toHexString()) + "," + jsonPair("tickLower", event.params.tickLower.toString()) + "," + jsonPair("tickUpper", event.params.tickUpper.toString()) + "," + jsonPair("amount", event.params.amount.toString()) + "," + jsonPair("amount0", event.params.amount0.toString()) + "," + jsonPair("amount1", event.params.amount1.toString()) + "}"
  normalized.from = event.transaction.from
  normalized.to = event.transaction.to
  normalized.value = event.transaction.value
  normalized.gasPrice = event.transaction.gasPrice
  normalized.gasLimit = event.transaction.gasLimit
  normalized.input = event.transaction.input
  normalized.save()
}

export function handleSetFeeProtocol(event: SetFeeProtocolEvent): void {
  let entity = new SetFeeProtocol(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.feeProtocol0Old = event.params.feeProtocol0Old
  entity.feeProtocol1Old = event.params.feeProtocol1Old
  entity.feeProtocol0New = event.params.feeProtocol0New
  entity.feeProtocol1New = event.params.feeProtocol1New
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()

  let normalized = new ChainSentryEvent(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  normalized.contractAddress = event.address
  normalized.blockNumber = event.block.number
  normalized.blockTimestamp = event.block.timestamp
  normalized.transactionHash = event.transaction.hash
  normalized.transactionIndex = event.transaction.index
  normalized.logIndex = event.logIndex
  normalized.eventName = "SetFeeProtocol"
  normalized.eventSignature = "SetFeeProtocol(uint8,uint8,uint8,uint8)"
  normalized.topic0 = "0x973d8d92bb299f4af6ce49b52a8adb85ae46b9f214c4c4fc06ac77401237b133"
  normalized.args = "{" + jsonPair("feeProtocol0Old", event.params.feeProtocol0Old.toString()) + "," + jsonPair("feeProtocol1Old", event.params.feeProtocol1Old.toString()) + "," + jsonPair("feeProtocol0New", event.params.feeProtocol0New.toString()) + "," + jsonPair("feeProtocol1New", event.params.feeProtocol1New.toString()) + "}"
  normalized.from = event.transaction.from
  normalized.to = event.transaction.to
  normalized.value = event.transaction.value
  normalized.gasPrice = event.transaction.gasPrice
  normalized.gasLimit = event.transaction.gasLimit
  normalized.input = event.transaction.input
  normalized.save()
}

export function handleSwap(event: SwapEvent): void {
  let entity = new Swap(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.sender = event.params.sender
  entity.recipient = event.params.recipient
  entity.amount0 = event.params.amount0
  entity.amount1 = event.params.amount1
  entity.sqrtPriceX96 = event.params.sqrtPriceX96
  entity.liquidity = event.params.liquidity
  entity.tick = event.params.tick
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()

  let normalized = new ChainSentryEvent(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  normalized.contractAddress = event.address
  normalized.blockNumber = event.block.number
  normalized.blockTimestamp = event.block.timestamp
  normalized.transactionHash = event.transaction.hash
  normalized.transactionIndex = event.transaction.index
  normalized.logIndex = event.logIndex
  normalized.eventName = "Swap"
  normalized.eventSignature = "Swap(address,address,int256,int256,uint160,uint128,int24)"
  normalized.topic0 = "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"
  normalized.args = "{" + jsonPair("sender", event.params.sender.toHexString()) + "," + jsonPair("recipient", event.params.recipient.toHexString()) + "," + jsonPair("amount0", event.params.amount0.toString()) + "," + jsonPair("amount1", event.params.amount1.toString()) + "," + jsonPair("sqrtPriceX96", event.params.sqrtPriceX96.toString()) + "," + jsonPair("liquidity", event.params.liquidity.toString()) + "," + jsonPair("tick", event.params.tick.toString()) + "}"
  normalized.from = event.transaction.from
  normalized.to = event.transaction.to
  normalized.value = event.transaction.value
  normalized.gasPrice = event.transaction.gasPrice
  normalized.gasLimit = event.transaction.gasLimit
  normalized.input = event.transaction.input
  normalized.save()
}
