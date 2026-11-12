import { useState, useEffect } from "react";
import ProductCard from "../components/ProductCard";

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const response = await fetch("/store/product/get");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load products");
        }

        setProducts(data.data || []);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  async function handleAddToCart(productId) {
    try {
      const response = await fetch("/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          productId: productId,
          quantity: 1,
        }), 
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not add item to cart");
      }

      alert(data.message || "Item added to cart!");
    } catch (err) {
      console.error("Add to cart error:", err);
      alert(err.message);
    }
  }

  if (loading) return <p>Loading products...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h1>Our Products</h1>

      <div className="products-grid">
        {products.map((product) => (
          <ProductCard
            key={product._id}
            name={product.name}
            price={product.price}
            image={product.image}
            onAddToCart={() => handleAddToCart(product._id)}
          />
        ))}
      </div>
    </div>
  );
}

export default Products;