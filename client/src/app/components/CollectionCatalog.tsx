import { useParams } from "react-router";
import { ProductCatalog } from "./ProductCatalog";

/**
 * Dedicated page for a single collection (route: /retailer/collections/:id).
 * Reuses the full catalog UI, scoped to the collection's products.
 */
export function CollectionCatalog() {
  const { id } = useParams<{ id: string }>();
  return <ProductCatalog collectionId={id} />;
}
