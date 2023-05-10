export default {
  getAllWarehouses: async () => {
    const warehouseData = await getWarehouses.run();
    return warehouseData.map(d => {
      return {
        Id: d.id,
        WarehouseName: d.label,
        Stock: '',
      }
    })
  },
  getProductWarehouses: async () => {
    const productWarehousesRaw = await getProductLocations.run({
      variationId: tbl_products.triggeredRow.VariationId,
    });
    const allWarehouses = await this.getAllWarehouses();

    const productWarehouses = productWarehousesRaw.map(d => {
      return {
        Id: d.id,
        WarehouseName: d.label,
        Stock: d.stock,
      }
    })

    return this.getUniqueWarehouseWithDefaultStock(allWarehouses, productWarehouses);
  },
  getProductWarehousesForUpdate: async () => {
    const productWarehousesRaw = await getProductLocations.run({
      variationId: tbl_products.triggeredRow.VariationId,
    });
    const allWarehouses = await this.getAllWarehouses();

    const productWarehouses = productWarehousesRaw.map(d => {
      return {
        Id: d.id,
        WarehouseName: d.label,
        Stock: d.stock,
      }
    })

    const adjustedWarehousesArray = this.getUniqueWarehouseWithDefaultStock(allWarehouses, productWarehouses)

    storeValue('productLocation', adjustedWarehousesArray);

    return productWarehouses;
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
  addProduct: async () => {
    const warehouses = await this.getAllWarehouses()

    if (!warehouses || warehouses.length < 1) {
      return showAlert('Add warehouse before adding product', 'info');
    }

    try {
      // Create base product
      const product = await addProduct.run({
        name: inp_productName.text,
        description: inp_productDescription.text || '',
        category: sel_productCategory.selectedOptionValue || '',
				image: inp_productImage.text,
      });
      // Create default product variant
      const productVariant = await addProductVariant.run({
        productId: product[0].id,
        sku: inp_productSku.text || null,
        salePrice: parseFloat(inp_productSalePrice.text),
        costPrice: parseFloat(inp_productCostPrice.text) || undefined,
        reorderPoint: inp_productReorderPoint.text || 5,
      });

      const productStockLocations = tbl_productStock.updatedRows.map(r => {
        return {
          Id: r.allFields.Id,
          WarehouseName: r.allFields.WarehouseName,
          Stock: r.allFields.Stock,
        }
      });
      const allStockLocations = await this.getAllWarehouses();
      // This function retrieves information on all warehouses that stock a particular product. It includes the current stock levels  			of the product in each warehouse, as well as any warehouses that do not stock the product, with their stock levels set to 					zero.
      const normalizedStockLocation = this.getUniqueWarehouseWithDefaultStock(allStockLocations, productStockLocations)

      if (normalizedStockLocation && normalizedStockLocation.length > 0) {
        let i = 0;

        // Add product to required warehouse(s)
        while (i < normalizedStockLocation.length) {
          await addProductLocation.run({
            variantId: productVariant[0].id,
            locationId: normalizedStockLocation[i].Id,
            stock: normalizedStockLocation[i].Stock,
          });
          i++;
        }
      }

      await this.getProducts();
      closeModal('mdl_addProduct');
      showAlert('Product Created!', 'success');
    } catch (error) {
			console.log('ERROR_CREATING_PRODUCT', error);
      showAlert('Error creating product!', 'error');
    }
  },
  updateProduct: async (updateType) => {
    // updateType allows this function to handle product updates from table rows and forms
    let updateProductParams;
    let updateVariantParams;
    try {
      if (updateType === 'TABLE') {
        updateProductParams = {
          productId: tbl_products.updatedRow.Id,
          name: tbl_products.updatedRow.Name,
          description: tbl_products.updatedRow.Description,
          type: tbl_products.updatedRow.Category,
					image: tbl_products.updatedRow.Image,
        };
        updateVariantParams = {
          variantId: tbl_products.updatedRow.VariationId,
          costPrice: tbl_products.updatedRow.CostPrice,
          salePrice: tbl_products.updatedRow.SalePrice,
          lowStock: tbl_products.updatedRow.LowStock || 0,
          sku: tbl_products.updatedRow.Sku || null,
        };

      } else {
        updateProductParams = {
          productId: tbl_products.triggeredRow.Id,
          name: inp_productDetailName.text,
          description: inp_productDetailDescription.text,
          type: sel_productDetailCategory.selectedOptionValue,
					image: inp_productDetailImg.text,
        };
        updateVariantParams = {
          variantId: tbl_products.triggeredRow.VariationId,
          costPrice: inp_productDetailCostPrice.text || 0,
          salePrice: inp_productDetailSalePrice.text,
          lowStock: inp_productDetailReorderPoint.text || 0,
          sku: inp_productDetailSku.text || null,
        };
      }
      await updateProduct.run(updateProductParams);
      await updateProductVariant.run(updateVariantParams);
      // When updating product, update product stock in warehouses if required
      tbl_productDetailStock.updatedRows.map(async s => {
        // Check to see if the product exists in a particular warehouse
        console.log({
          variantId: updateVariantParams.variantId,
          locationId: s.allFields.Id
        })
        const productLocationExists = await checkProductLocation.run({
          // variantId: updateVariantParams.variantId,
          // locationId: s.allFields.Id
          id: s.allFields.Id,
        })
        // If product exists, update the stock, if it doesnt exists, create a new entry
        if (productLocationExists && productLocationExists.length > 0) {
          await updateProductLocation.run({
            stock: s.allFields.Stock,
            id: s.allFields.Id,
          })
        } else {
					console.log('DATA:', {
            variantId: updateVariantParams.variantId,
            locationId: s.allFields.Id,
            stock: s.allFields.Stock,
          })
          await addProductLocation.run({
            variantId: updateVariantParams.variantId,
            locationId: s.allFields.Id,
            stock: s.allFields.Stock,
          })
        }

      })

      await this.getProducts();
      await this.getProductWarehouses();
      showAlert('Product Updated!', 'success');
    } catch (error) {
      console.log(error);
      showAlert('Error updating product!', 'error');
    }
  },
  getProducts: async () => {
    const stockFilter = sel_productStockFilter.selectedOptionValue;
    const products = await getProducts.run();
    let filteredProducts = products;

    if (stockFilter === 'Low stock') {
      filteredProducts = products.filter(p => p.total_stock && p.total_stock < p.low_stock && p.total_stock !== 0);
    } else if (stockFilter === 'Out of stock') {
      filteredProducts = products.filter(p => p.total_stock < 1);
    }

    return filteredProducts.map(p => ({
      Id: p.id,
      Name: p.name,
      SalePrice: p.price,
      CostPrice: p.cost,
      Sku: p.sku,
      Category: p.category,
      LowStock: p.low_stock,
      Image: p.image,
      TotalStock: p.total_stock,
      VariationId: p.product_variant_id,
      Description: p.description
    }));
  },
  returnStockStatus: (total, low_stock) => {
    if (!total || total < 1) {
      return {
        status: 'Out of Stock',
        color: 'RGB(255, 0, 0)'
      };
    }
    if (total < low_stock) {
      return {
        status: 'Low',
        color: 'RGB(255, 165, 0)'
      };
    }
    return {
      status: 'Normal',
      color: 'RGB(0, 128, 0)'
    };
  },
  getCategories: async () => {
    const products = await this.getProducts();
    const categories = products.map(p => p.Category);
    const sanitisedCategories = categories.filter(category => category !== null && category.trim() !== "");

    if (!products || products.length < 1) {
      return [{
          id: 1,
          name: 'Food',
        },
        {
          id: 2,
          name: 'Gadget',
        }
      ]
    }


    const uniqueCategoriesRaw = {}

    for (let i = 0; i < sanitisedCategories.length; i++) {
      // Add each string to the object as a key with a value of true
      uniqueCategoriesRaw[sanitisedCategories[i]] = true;
    }

    // Get an array of unique strings from the object keys
    const uniqueCategories = Object.keys(uniqueCategoriesRaw);

    return uniqueCategories.map((category, index) => {
      return {
        id: index,
        name: category,
      }
    })
  },
  deleteProduct: async (id) => {
    try {
      await deleteProduct.run({
        productId: id
      })
      await this.getProducts();
      showAlert('Product Deleted!', 'success');
      closeModal('mdl_confirmDelete');
    } catch (error) {
      showAlert('Error deleting product!', 'error');
    }
  },
  getPurchaseOrders: async () => {
    const orders = await getPurchaseOrders.run();

    return orders.map(o => {
      return {
        Id: o.id,
        Supplier: o.name,
        Warehouse: o.label,
        OrderDate: new Date(o.order_date).toDateString(),
        Status: o.status,
        Tax: o.tax,
        Address: o.address,
        SupplierId: o.supplier_id,
        WarehouseId: o.warehouse_id,
      }
    })
  },
  getSuppliers: async () => {
    const suppliers = await getSuppliers.run();
    return suppliers.map(s => {
      return {
        Id: s.id,
        Name: s.name,
        Email: s.email,
        Phone: s.phone,
      }
    })
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
  purchaseOrderTotal: () => {
    if (appsmith.store.purchaseOrderProducts && appsmith.store.purchaseOrderProducts.length > 0) {
      const products = appsmith.store.purchaseOrderProducts;
      const total = products.reduce((a, b) => a + b.quanitity * b.price, 0);
      return total.toFixed(2);
    } else {
      return 0;
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
      console.log('got here');
      appsmith.store.purchaseOrderProducts.map(async p => {
        await addPurchaseOrderProduct.run({
          productId: p.id,
          quantity: parseInt(p.quantity) || 1,
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
}