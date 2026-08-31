const fs = require('fs');
const file = 'src/components/AdminPortal.tsx';
let code = fs.readFileSync(file, 'utf8');

const originalHandleBrandCleanup = `  const handleBrandCleanup = async () => {
    if (!confirm('This will standardize all product brands (e.g. converting "samsung electronics" to "Samsung", fixing casing). Proceed?')) return;
    setIsCleaningBrands(true);
    try {
      let updatedCount = 0;
      for (const p of products) {
        if (!p.brand) continue;
        const currentBrand = p.brand.trim();
        if (!currentBrand) continue;
        
        // Convert to Title Case
        let cleanBrand = currentBrand
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ')
          .trim();
          
        if (String(cleanBrand || "").toLowerCase().includes('samsung')) cleanBrand = 'Samsung';
        if (String(cleanBrand || "").toLowerCase().includes('apple')) cleanBrand = 'Apple';
        if (String(cleanBrand || "").toLowerCase().includes('sony')) cleanBrand = 'Sony';
        if (String(cleanBrand || "").toLowerCase().includes('hisense')) cleanBrand = 'Hisense';
        if (String(cleanBrand || "").toLowerCase().includes('tcl')) cleanBrand = 'TCL';
        if (String(cleanBrand || "").toLowerCase().includes('lg')) cleanBrand = 'LG';
        if (String(cleanBrand || "").toLowerCase().includes('tecno')) cleanBrand = 'Tecno';
        if (String(cleanBrand || "").toLowerCase().includes('infinix')) cleanBrand = 'Infinix';
        if (String(cleanBrand || "").toLowerCase().includes('itel')) cleanBrand = 'Itel';

        if (p.brand !== cleanBrand) {
          await updateProduct({ ...p, brand: cleanBrand });
          updatedCount++;
        }
      }
      showAlert('Brands Standardized', \`Successfully cleaned up \${updatedCount} product brand tags across the catalog.\`);
    } catch (err: any) {
      showAlert('Brand Cleanup Error', err.message || 'Failed to clean product brands', 'error');
    } finally {
      setIsCleaningBrands(false);
    }
  };`;

const newHandleBrandCleanup = `  const handleBrandCleanup = async () => {
    showConfirm('Standardize Brands', 'This will standardize all product brands (e.g. converting "samsung electronics" to "Samsung", fixing casing). Proceed?', async () => {
      setIsCleaningBrands(true);
      try {
        let updatedCount = 0;
        for (const p of products) {
          if (!p.brand) continue;
          const currentBrand = p.brand.trim();
          if (!currentBrand) continue;
          
          // Convert to Title Case
          let cleanBrand = currentBrand
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ')
            .trim();
            
          if (String(cleanBrand || "").toLowerCase().includes('samsung')) cleanBrand = 'Samsung';
          if (String(cleanBrand || "").toLowerCase().includes('apple')) cleanBrand = 'Apple';
          if (String(cleanBrand || "").toLowerCase().includes('sony')) cleanBrand = 'Sony';
          if (String(cleanBrand || "").toLowerCase().includes('hisense')) cleanBrand = 'Hisense';
          if (String(cleanBrand || "").toLowerCase().includes('tcl')) cleanBrand = 'TCL';
          if (String(cleanBrand || "").toLowerCase().includes('lg')) cleanBrand = 'LG';
          if (String(cleanBrand || "").toLowerCase().includes('tecno')) cleanBrand = 'Tecno';
          if (String(cleanBrand || "").toLowerCase().includes('infinix')) cleanBrand = 'Infinix';
          if (String(cleanBrand || "").toLowerCase().includes('itel')) cleanBrand = 'Itel';

          if (p.brand !== cleanBrand) {
            await updateProduct({ ...p, brand: cleanBrand });
            updatedCount++;
          }
        }
        showAlert('Brands Standardized', \`Successfully cleaned up \${updatedCount} product brand tags across the catalog.\`);
      } catch (err: any) {
        showAlert('Brand Cleanup Error', err.message || 'Failed to clean product brands', 'error');
      } finally {
        setIsCleaningBrands(false);
      }
    });
  };`;

code = code.replace(originalHandleBrandCleanup, newHandleBrandCleanup);

fs.writeFileSync(file, code);
console.log('patched handleBrandCleanup');
