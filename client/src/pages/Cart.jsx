function Cart(props) {
     console.log(props.cart);
  return (
    <div>
      <h1>Shopping Cart</h1>

      {props.cart.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        props.cart.map((item) => (
          <div key={item.id}>
            <h3>{item.name}</h3>
            <p>Price: ₹{item.price}</p>
            <p>Quantity: {item.quantity}</p>
          </div>
        ))
      )}
    </div>
  );
}

export default Cart;