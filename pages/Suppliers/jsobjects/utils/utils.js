export default {
  addSupplierProductToStore: () => {
    const currentItems = appsmith.store.supplierProducts || [];
    const newItem = tbl_addSupplierProducts.newRow;

    storeValue('supplierProducts', [...currentItems, {
      Id: Math.random(),
      ...newItem,
    }])
  },
  addSupplier: async () => {
    const supplierProducts = appsmith.store.supplierProducts;
    const supplier = await addSupplier.run({
      name: inp_supplierName.text,
      phone: inp_supplierPhone.text,
      email: inp_supplierEmail.text,
      address: inp_supplierAddress.text,
    })
		
		console.log('SP:', supplierProducts);

    if (supplierProducts) {
      supplierProducts.map(async p => {
				console.log('got here');
        await addSupplierProduct.run({
          name: p.Name,
          price: p.Price,
          description: p.Description,
          supplierId: supplier[0].id,
        })
      })
    }

    removeValue('supplierProducts');
    closeModal('mdl_addSupplier');
    await this.getSuppliers();
    showAlert('Supplier created!', 'success');
  },
  addSupplierRow: async () => {
    await addSupplier.run({
      name: tbl_suppliers.newRow.Name,
      phone: tbl_suppliers.newRow.Phone || '',
      email: tbl_suppliers.newRow.Email || '',
      address: tbl_suppliers.newRow.Address || ''
    })
    await this.getSuppliers()
    showAlert('Supplier created!', 'success');
  },
  getSuppliers: async () => {
    const suppliers = await getSuppliers.run();

    return suppliers.map(s => {
      return {
        Id: s.id,
        Name: s.name,
        Email: s.email,
        Phone: s.phone,
        Address: s.address,
      }
    })
  },
  getSupplierProducts: async (supplierId) => {
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
  },
  deleteSupplierProduct: async () => {
    try {
      await deleteSupplierProduct.run();
      await this.getSupplierProducts(tbl_suppliers.triggeredRow.Id);
      showAlert('Supplier product deleted!', 'success');
    } catch (error) {
      console.log(error)
      showAlert('Error deleting supplier product!', 'error');
    }
  },
  addSingleSupplierProduct: async () => {
    await addSupplierProduct.run({
      name: tbl_supplierDetailsProducts.newRow.Name,
      price: tbl_supplierDetailsProducts.newRow.Price,
      sku: tbl_supplierDetailsProducts.newRow.Sku || '',
      description: tbl_supplierDetailsProducts.newRow.Description || '',
      supplierId: tbl_suppliers.triggeredRow.Id,
    })

    await this.getSupplierProducts(tbl_suppliers.triggeredRow.Id)
    showAlert('Supplier product added!', 'success');
  },
  updateSupplierProduct: async () => {
    await updateSupplierProduct.run();
    await this.getSupplierProducts(tbl_suppliers.triggeredRow.Id)
  },
  updateSupplier: async (updateType) => {
    let supplierUpdateParams;

    if (updateType === 'TABLE') {
      supplierUpdateParams = {
        name: tbl_suppliers.updatedRow.Name,
        email: tbl_suppliers.updatedRow.Email,
        phone: tbl_suppliers.updatedRow.Phone,
        address: tbl_suppliers.updatedRow.Address,
        id: tbl_suppliers.updatedRow.Id,
      }

      await updateSupplier.run(supplierUpdateParams);
    } else {
      supplierUpdateParams = {
        name: inp_supplierDetailName.text,
        email: inp_supplierDetailEmail.text,
        phone: inp_supplierDetailPhone.text,
        address: inp_supplierDetailAddress.text,
        id: tbl_suppliers.triggeredRow.Id,
      }
      await updateSupplier.run(supplierUpdateParams);
      closeModal('mdl_supplierDetails');
    }

    await this.getSuppliers();
  },
  deleteSupplier: async () => {
    await deleteSupplier.run();
    await this.getSuppliers();

    closeModal('mdl_supplierDetails')
    closeModal('mdl_confirmDelete');
    showAlert('Supplier deleted!', 'success');
  },
}