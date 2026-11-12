import { useState, useEffect } from "react";

function Cart() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCart() {
      try {
        setLoading(true);
        setError(null);

        // Vite proxy forwards '/cart' directly to http://localhost:5000/cart
        const response = await fetch("/cart", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Ensures JWT cookie is included
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load cart");
        }

        // data.data is the cart object; data.data.items is the array of populated products
        setCartItems(data.data?.items || []);
      } catch (err) {
        console.error("Cart fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCart();
  }, []);

  async function handleUpdateQuantity(productId, newQuantity) {
  if (newQuantity < 1) return;

  try {
    const response = await fetch("/cart/update", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        productId: productId,
        quantity: newQuantity,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to update quantity");
    }

    // Update local React state while preserving populated product details
    setCartItems((previousItems) =>
      previousItems.map((item) =>
        item.product?._id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  } catch (err) {
    console.error("Update quantity error:", err);
    alert(err.message);
  }
}

  if (loading) {
    return <div className="cart-container"><p>Loading your cart...</p></div>;
  }

  if (error) {
    return (
      <div className="cart-container">
        <p className="error-message">Error: {error}</p>
        <p>Please log in to view your cart.</p>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="cart-container">
        <h2>Your Cart</h2>
        <p>Your cart is empty.</p>
      </div>
    );
  }

  const subtotal = cartItems.reduce((acc, item) => {
    const price = item.product?.price || 0;
    return acc + price * item.quantity;
  }, 0);

  return (
    <div className="cart-container">
      <h2>Your Cart</h2>
      <div className="cart-list">
        {cartItems.map((item) => (
          <div key={item._id} className="cart-item">
            <div className="item-details">
              <h4>{item.product?.name || "Product"}</h4>
              <p>Price: ₹{item.product?.price}</p>
              <p>Quantity: {item.quantity}</p>
              
            </div>
              <div className="quantity-controls">
                <button
                  onClick={() => handleUpdateQuantity(item.product._id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  -
                </button>

                <span> {item.quantity} </span>

                <button
                  onClick={() => handleUpdateQuantity(item.product._id, item.quantity + 1)}
                >
                  +
                </button>
                <p>Total: ₹{(item.product?.price || 0) * item.quantity}</p>
              </div>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <h3>Subtotal: ₹{subtotal}</h3>
      </div>
    </div>
  );
}

export default Cart;