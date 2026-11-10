type OrderId = string | number;

type OrderedItem = {
  id: OrderId;
  order: number;
};

export const compactUniqueOrdersAfterDelete = async ({
  deletedItemId,
  orderedItems,
  updateOrder,
}: {
  deletedItemId: OrderId;
  orderedItems: OrderedItem[];
  updateOrder: (id: OrderId, order: number) => Promise<unknown>;
}) => {
  const shiftedItems = orderedItems
    .filter((item) => item.id !== deletedItemId)
    .sort((first, second) => first.order - second.order)
    .map((item, index) => ({ ...item, nextOrder: index + 1 }))
    .filter((item) => item.order !== item.nextOrder);
  const updatedItems: (OrderedItem & { nextOrder: number })[] = [];

  try {
    for (const item of shiftedItems) {
      await updateOrder(item.id, item.nextOrder);
      updatedItems.push(item);
    }
  } catch (updateError) {
    for (const item of [...updatedItems].reverse()) {
      try {
        await updateOrder(item.id, item.order);
      } catch (rollbackError) {
        void rollbackError;
      }
    }

    throw updateError;
  }
};

export const swapUniqueOrders = async ({
  itemId,
  itemOrder,
  adjacentId,
  adjacentOrder,
  temporaryOrder,
  updateOrder,
}: {
  itemId: OrderId;
  itemOrder: number;
  adjacentId: OrderId;
  adjacentOrder: number;
  temporaryOrder: number;
  updateOrder: (id: OrderId, order: number) => Promise<unknown>;
}) => {
  let itemMovedToTemporaryOrder = false;
  let adjacentItemMoved = false;

  try {
    await updateOrder(itemId, temporaryOrder);
    itemMovedToTemporaryOrder = true;

    await updateOrder(adjacentId, itemOrder);
    adjacentItemMoved = true;

    await updateOrder(itemId, adjacentOrder);
  } catch (swapError) {
    if (adjacentItemMoved) {
      try {
        await updateOrder(adjacentId, adjacentOrder);
      } catch (rollbackError) {
        void rollbackError;
      }
    }

    if (itemMovedToTemporaryOrder) {
      try {
        await updateOrder(itemId, itemOrder);
      } catch (rollbackError) {
        void rollbackError;
      }
    }

    throw swapError;
  }
};
