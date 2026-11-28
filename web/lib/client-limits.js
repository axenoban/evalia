export function orderLimits(model, dozens, extras) {
  const capacity = model?.available && Number.isSafeInteger(model.orderCapacity)
    ? Math.max(0, model.orderCapacity) : 0;
  return {
    capacity,
    maxDozens: Math.max(0, Math.min(999, Math.floor((capacity - extras) / 12))),
    maxExtras: Math.max(0, Math.min(11, model?.colors?.length || 0, capacity - dozens * 12)),
  };
}
