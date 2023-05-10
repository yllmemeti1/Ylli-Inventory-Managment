export default {
  clearStore: () => {
    storeValue('supplier', null);
    storeValue('supplierProducts', null);
    storeValue('warehouse', null);
    storeValue('purchaseOrderProducts', null);
    storeValue('confirmProducts', null);
  },
  getSuppliers: async () => {
    const suppliers = await getSuppliers.run();
    if (suppliers) {
      return suppliers.map(s => {
        return {
          Id: s.id,
          Name: s.name,
          Email: s.email,
          Phone: s.phone,
        }
      })
    } else {
      return [];
    }
  },
  getSupplierProducts: async () => {
    const supplierId = sel_chooseSupplier.selectedOptionValue;
    if (supplierId) {
      const products = await getSupplierProducts.run({
        supplierId
      });
      return products.map(p => {
        return {
          Id: p.id,
          Name: p.name,
          Price: p.price,
          Description: p.description,
          Image: p.image,
          Sku: p.sku,
        }
      })
    }
  },
  setSupplier: async () => {
    const supplierId = sel_chooseSupplier.selectedOptionValue;
    if (supplierId) {
      const supplier = await getSupplier.run({
        supplierId: supplierId
      });
      const supplierProducts = await this.getSupplierProducts();
      storeValue('supplier', supplier[0]);
      storeValue('supplierProducts', supplierProducts);
      storeValue('purchaseOrderProducts', null);
      this.purchaseOrderTotal();
    } else {
      storeValue('supplier', null);
      storeValue('supplierProducts', null);
    }
  },
  setWarehouse: async (warehouseId) => {
    if (warehouseId) {
      const warehouses = await getWarehouses.run();
      const activeWarehouse = warehouses.filter(w => w.id === warehouseId);
      storeValue('warehouse', activeWarehouse[0]);
    } else {
      storeValue('warehouse', null);
    }
  },
  setProduct: async () => {
    if (sel_product.selectedOptionValue) {
      const product = await getSupplierProduct.run({
        id: sel_product.selectedOptionValue
      });
      const existingProducts = appsmith.store.purchaseOrderProducts ? appsmith.store.purchaseOrderProducts : [];
      storeValue('purchaseOrderProducts', [...existingProducts, {
        ...product[0],
        quanitity: inp_productQty.text
      }]);
      this.purchaseOrderTotal();
    } else {
      storeValue('purchaseOrderProducts', null);
    }
  },
  removeProduct: async () => {
    const products = appsmith.store.purchaseOrderProducts;

    const filteredProducts = products.filter(p => p.id !== tbl_purchaseOrderProducts.triggeredRow.id);

    storeValue('purchaseOrderProducts', filteredProducts);

    return filteredProducts;
  },
  addPurchaseOrder: async () => {
    const purchaseOrder = await addPurchaseOrder.run({
      supplierId: appsmith.store.supplier.id,
      warehouseId: appsmith.store.warehouse.id,
      tax: inp_tax.text,
      orderDate: dat_orderDate.formattedDate,
    });

    if (appsmith.store.purchaseOrderProducts && appsmith.store.purchaseOrderProducts.length > 0) {
      appsmith.store.purchaseOrderProducts.map(async p => {
        await addPurchaseOrderProduct.run({
          productId: p.id,
          quantity: parseInt(p.quanitity) || 1,
          purchaseOrderId: purchaseOrder[0].id,
        })
      })
    }

    await this.getPurchaseOrders();
    closeModal('mdl_addPurchaseOrder');
    showAlert('Purchase Order Created!', 'success');
    storeValue('supplier', null);
    storeValue('warehouse', null);
    storeValue('supplierProducts', null);
    storeValue('purchaseOrderProducts', null);
  },
  getPurchaseOrders: async () => {
    const filter = sel_purchaseOrderStatus.selectedOptionValue;
    console.log('FILTER:', filter)
    const orders = await getPurchaseOrders.run();

    let filteredProducts = orders;

    if (filter === 'UNFULFILLED') {
      filteredProducts = orders.filter(o => o.status === 'UNFULFILLED');
    } else if (filter === 'RECEIVED') {
      filteredProducts = orders.filter(o => o.status === 'RECEIVED');
    } else if (filter === 'CANCELLED') {
      filteredProducts = orders.filter(o => o.status === 'FULFILLED');
    } else if (filter === 'ALL') {
      filteredProducts = orders;
    }

    return filteredProducts.map(o => {
      return {
        Id: o.id,
        Supplier: o.name,
        Warehouse: o.label,
        OrderDate: new Date(o.order_date).toDateString(),
        Status: o.status,
        Tax: o.tax,
        Address: o.address1,
        SupplierId: o.supplier_id,
        WarehouseId: o.location_id,
      }
    })
  },
  purchaseOrderStatus: (status) => {
    if (!status) {
      return {
        status: '',
        color: 'RGB(0, 128, 0)'
      }
    }
    if (status === 'CANCELLED') {
      return {
        status: 'CANCELLED',
        color: 'RGB(255, 0, 0)'
      };
    }
    if (status === 'UNFULFILLED') {
      return {
        status: 'UNFULFILLED',
        color: '#eab308'
      };
    }
    return {
      status: 'RECEIVED',
      color: 'RGB(0, 128, 0)'
    };
  },
  deletePurchaseOrders: async () => {
    await deletePurchaseOrder.run();
    await this.getPurchaseOrders();
    showAlert('Purchase Order Deleted!', 'success');
  },
  updatePurchaseOrder: async () => {
    await updatePurchaseOrder.run();
    await this.getPurchaseOrders();
    closeModal('mdl_addPurchaseOrder');
    showAlert('Purchase Order Updated!', 'success');
    storeValue('supplier', null);
    storeValue('warehouse', null);
    storeValue('supplierProduct', null);
  },
  purchaseOrderTotal: () => {
    if (appsmith.store.purchaseOrderProducts && appsmith.store.purchaseOrderProducts.length > 0) {
      const products = appsmith.store.purchaseOrderProducts;
      const total = products.reduce((a, b) => a + b.quanitity * b.price, 0);
      return total.toFixed(2);
    } else {
      return 0;
    }
  },
  setPurchaseOrderProductsConfirm: async (purchaseOrderId) => {
    const value = purchaseOrderId ? purchaseOrderId : tbl_purchaseOrders.triggeredRow.Id;
    const data = await getPurchaseOrderProducts.run({
      purchaseOrderId: value
    });
    storeValue('purchaseOrderConfirmProducts', data);
    return data;
  },
  purchaseOrderConfirmTotal: () => {
    if (appsmith.store.purchaseOrderConfirmProducts && appsmith.store.purchaseOrderConfirmProducts.length > 0) {
      const products = appsmith.store.purchaseOrderConfirmProducts;
      const total = products.reduce((a, b) => {
        return a + (b.price * b.quantity);
      }, 0);
      return total.toFixed(2);
    } else {
      return 0;
    }
  },
  setAndUnsetConfirmProducts: async (product) => {
    if (product) {
      const confirmProducts = appsmith.store.confirmProducts || [];
      if (confirmProducts.length === 0) {
        // If the array is empty, just add the object
        storeValue('confirmProducts', [product]);
        return;
      }

      const index = confirmProducts.findIndex(item => item.id === product.id);
      if (index === -1) {
        // Object not found in array, so add it
        storeValue('confirmProducts', [...confirmProducts, product]);
      } else {
        // Object found in array, so remove it
        const updatedProducts = confirmProducts.splice(index, 1);
        storeValue('confirmProducts', updatedProducts);
      }
    }
  },
  getAllWarehouses: async () => {
    // Retrieve data for all warehouses and wait until the promise is resolved.
    const warehouseData = await getWarehouses.run();
    // Map the data for each warehouse to a simpler format, including only certain fields for the table
    return warehouseData.map(d => {
      return {
        Id: d.id,
        WarehouseName: d.label,
        Stock: '',
      }
    })
  },
  getUniqueWarehouseWithDefaultStock: (allWarehouses, editedWarehouses) => {
    // Combine the two arrays
    const combinedArr = [...allWarehouses, ...editedWarehouses];

    // Create an object to store stock for each warehouse
    const stockCounts = {};

    // Loop through the combined array to count each name
    combinedArr.forEach(obj => {
      const Name = obj.WarehouseName;
      const Stock = obj.Stock || 0; // Default count to zero if undefined
      const Id = obj.Id;

      if (stockCounts[Name] === undefined) {
        // If this is the first time we've seen this name, set its count
        stockCounts[Name] = {
          Stock,
          Id
        };
      } else {
        // If we've seen this name before, update to its count
        stockCounts[Name] = {
          Stock,
          Id,
        };
      }
    });

    // Create an array of objects with unique warehouses and their stock
    const uniqueWarehouses = Object.keys(stockCounts).map(Name => {
      return {
        WarehouseName: Name,
        Stock: stockCounts[Name].Stock,
        Id: stockCounts[Name].Id
      };
    });

    return uniqueWarehouses;
  },
  handleMarkReceived: async () => {
    const products = appsmith.store.confirmProducts;

    if (products && products.length > 0) {
      for (const p of products) {

        // Create base product
        const product = await addProduct.run({
          name: p.name,
          description: '',
          category: '',
        });

        // Create default product variant
        const productVariant = await addProductVariant.run({
          productId: product[0].id,
          sku: p.sku,
          salePrice: p.price,
          costPrice: null,
          reorderPoint: 5,
        });

        const productStockLocation = {
          Id: tbl_purchaseOrders.triggeredRow.WarehouseId,
          WarehouseName: tbl_purchaseOrders.triggeredRow.Warehouse,
          Stock: p.quantity,
        }

        const allStockLocations = await this.getAllWarehouses();
        console.log('ALL:', allStockLocations);
        console.log('PSL:', productStockLocation)
        const normalizedStockLocation = this.getUniqueWarehouseWithDefaultStock(allStockLocations, [productStockLocation]);
        console.log('NORM_LOCATION:', normalizedStockLocation);
        if (normalizedStockLocation && normalizedStockLocation.length > 0) {
          for (const l of normalizedStockLocation) {
            await addProductLocation.run({
              variantId: productVariant[0].id,
              locationId: l.Id,
              stock: l.Stock,
            });
          }
        }

      }

      await updatePurchaseOrderStatus.run({
        purchaseOrderId: products[0].purchase_order_id,
      });
      await this.getPurchaseOrders();
      closeModal('mdl_confirmPurchaseOrder');
      showAlert('Purchase Order Fulfilled!', 'success');
    } else {
      return showAlert('No Products to Confirm!')
    }
  }
}