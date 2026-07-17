// An order item is "customized" when the retailer picked metal/diamond/stone
// attributes that differ from the product's default configuration (the first
// comma-separated option in each product field — the same value ProductDetail
// preselects when a retailer first opens the product).
function firstOption(value) {
  if (!value) return null;
  const first = String(value).split(",")[0].trim();
  return first || null;
}

function isItemCustomized(item) {
  if (!item.product_id) return false; // no product to compare against
  const fieldPairs = [
    [item.metal_type, firstOption(item.product_metal_type)],
    [item.gold_colour, firstOption(item.product_gold_colour)],
    [item.diamond_shape, firstOption(item.product_diamond_shape)],
    [item.diamond_shade, firstOption(item.product_diamond_color)],
    [item.diamond_quality, firstOption(item.product_diamond_clarity)],
    [item.color_stone_name, firstOption(item.product_color_stone_name)],
    [item.color_stone_quality, firstOption(item.product_color_stone_quality)],
  ];
  const caratDiffers =
    item.carat != null && item.product_carat != null &&
    Number(item.carat) !== Number(item.product_carat);
  return caratDiffers || fieldPairs.some(([val, def]) => val && def && val !== def);
}

module.exports = { isItemCustomized };
