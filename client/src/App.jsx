import { BrowserRouter ,Routes,Route } from "react-router-dom"; 
import Home from "./pages/Home";
import Products from "./pages/Products";
import Cart from "./pages/Cart";
import Navbar from "./components/Navbar";
import { useState } from "react";

function App(){
  const [cart, setCart] = useState([]);
function handleAddToCart(product) {
  setCart((previousCart) => {
    const existingProduct = previousCart.find(
      (item) => item.id === product.id
    );

    if (existingProduct) {
      return previousCart.map((item) =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    }

    return [...previousCart, { ...product, quantity: 1 }];
  });
}
  return (
    <BrowserRouter>
    <Navbar />
    <Routes>
      <Route path="/" element={<Home/>} />
      <Route path="/products" element={<Products onAddToCart={handleAddToCart}/>}/>
      <Route path="/cart" element={<Cart cart={cart}/>}/>
    </Routes>
    </BrowserRouter>
  )
}

export default App;