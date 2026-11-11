const products = [
  { id: 1, name: "Laptop", price: 45000 },
  { id: 2, name: "Keyboard", price: 2499 },
  { id: 3, name: "Mouse", price: 999 }
];

function Products(props) {
  return (
    <div>
      <h1>Our Products</h1>

      {products.map((product) => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <p>Price: ₹{product.price}</p>

          <button onClick={() => props.onAddToCart(product)}>
            Add to Cart
          </button>
        </div>
      ))}
    </div>
  );
}

export default Products;