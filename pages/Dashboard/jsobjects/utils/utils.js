export default {
  dashboardMetrics: async () => {
    const products = await getProducts.run();
    const suppliers = await getSuppliers.run();
    const purchaseOrders = await getPurchaseOrders.run();

    return {
      productCount: products.length,
      lowStock: products.filter(p => p.total_stock < p.low_stock).length,
      outOfStock: products.filter(p => p.total_stock < 1).length,
      suppliers: suppliers.length,
      stockValue: products.reduce((a, b) => a + b.price, 0) || 0,
      unfulfilledPurchaseOrders: purchaseOrders.filter(p => p.status === 'UNFULFILLED').length,
      fulfilledPurchaseOrders: purchaseOrders.filter(p => p.status === 'RECEIVED').length,
    }
  },
  getPurchaseOrders: async () => {
    const orders = await getPurchaseOrders.run();
		const data = orders.map(o => {
        return {
          Id: o.id,
          Supplier: o.name,
          Warehouse: o.label,
          OrderDate: new Date(o.order_date).toDateString(),
          Status: o.status,
          Tax: o.tax,
          Address: o.address,
          Products: o.total_product_count,
        }
      })
    const tenDaysAgo = moment().subtract(10, 'days');
    if (orders) {
     	const filteredData = data.filter((o) =>
        moment(new Date(o.OrderDate)).isSameOrAfter(tenDaysAgo)
      )
			
			if (filteredData && filteredData.length > 0) {
				return filteredData;
			} else {
				return data;
			}
    } else {
      return [];
    }
  },
  purchaseOrderStatus: (status) => {
    if (status === 'CANCELLED') {
      return {
        status: 'CANCELLED',
        color: 'RGB(255, 0, 0)'
      };
    }
    if (status === 'UNFULFILLED') {
      return {
        status: 'UNFULFILLED',
        color: 'RGB(255, 165, 0)'
      };
    }
    return {
      status: 'RECEIVED',
      color: 'RGB(0, 128, 0)'
    };
  },
  getChartProducts: async () => {
    const products = await getProducts.run();
    if (products) {
      return products.map(p => {
        return {
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
        }
      });
    } else {
      return [];
    }
  },
  getProducts: async () => {
    const stockFilter = sel_stockLevel.selectedOptionValue;
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
        status: 'Empty',
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
  productWarehouseChartData: async () => {
    const productLocations = await getProductWarehouse.run();

    if (sel_product) {
      return productLocations.map(l => {
        return {
          Stock: l.stock,
          Warehouse: l.label,
        }
      })
    } else {
      return []
    }
  }
}