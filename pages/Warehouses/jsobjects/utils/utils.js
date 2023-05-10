export default {
  getAllWarehouses: async () => {
    const warehouseData = await getWarehouses.run();
    return warehouseData.map(d => {
      return {
        Id: d.id,
        Name: d.label,
        Address: d.address,
        Country: d.country,
        State: d.state,
        City: d.city,
        Postcode: d.postal_code,
      }
    })
  },
  setFromLocationProducts: async () => {
    if (sel_fromLocation.selectedOptionValue) {
      const warehouseProducts = await getWarehouseProducts.run({
        warehouseId: sel_fromLocation.selectedOptionValue
      });
      storeValue('fromWarehouseProducts', warehouseProducts);
    } else {
      storeValue('fromWarehouseProducts', null);
    }
  },
  addToProductTransferList: async () => {
    const productList = appsmith.store.productList;
    const warehouseProduct = await getWarehouseProduct.run();

    if (!productList || productList.length < 1) {
      storeValue('productList', [{
        Id: sel_chooseProduct.selectedOptionValue,
        ProductId: warehouseProduct[0].product_id,
        CurrentStock: warehouseProduct[0].stock,
        WarehouseId: warehouseProduct[0].location_id,
        Name: sel_chooseProduct.selectedOptionLabel,
        Quantity: inp_qty.text,
      }])
    } else {
      storeValue('productList', [...productList, {
        Id: sel_chooseProduct.selectedOptionValue,
        ProductId: warehouseProduct[0].product_id,
        CurrentStock: warehouseProduct[0].stock,
        WarehouseId: warehouseProduct[0].location_id,
        Name: sel_chooseProduct.selectedOptionLabel,
        Quantity: inp_qty.text,
      }])
    }
  },
  removeFromProductList: async () => {
    const productList = appsmith.store.productList;

    const newProductList = productList.filter(p => p.Id !== tbl_transferProducts.triggeredRow.Id);

    storeValue('productList', newProductList);
  },
  handleTransfer: async () => {
    const productsToTransfer = appsmith.store.productList;

    if (!productsToTransfer) showAlert('No products to transfer', 'error');

    for (const product of productsToTransfer) {
      console.log('PRD:', product)
      const newStockValueInOldWarehouse = (Number(product.CurrentStock) - Number(product.Quantity) < 1) ? 0 : Number(product.CurrentStock) - Number(product.Quantity);;

      // Update stock in old warehouse
      await updateWarehouseStock.run({
        stock: newStockValueInOldWarehouse,
        id: product.Id
      });

      // Check if product already exists in new warehouse
      const newWarehouseProducts = await getWarehouseProducts.run({
        warehouseId: sel_toLocation.selectedOptionValue
      });
      const warehouseHasProduct = newWarehouseProducts.filter(p => p.product_id === product.ProductId && p.location_id === sel_toLocation.selectedOptionValue);

      if (warehouseHasProduct && warehouseHasProduct.length > 0) {
        const newStockValue = Number(warehouseHasProduct[0].stock) + Number(product.Quantity);
        await updateWarehouseStock.run({
          stock: newStockValue,
          id: warehouseHasProduct[0].id
        });
      } else {
        await addWarehouseProduct.run({
          productId: product.ProductId,
          warehouseId: product.WarehouseId,
          stock: product.Quantity
        });
      }
    }
    closeModal('mdl_stockTransfers');
    storeValue('productList', null);
    showAlert('Stock Transfer Success!', 'success');
  },
}