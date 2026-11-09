import { BrowserRouter ,Routes,Route } from "react-router-dom"; 
import Home from "./pages/Home";
import Products from "./pages/Products";
import Cart from "./pages/Cart";
import Navbar from "./components/Navbar";
import { useState } from "react";

function App(){
  const [cart, setCart] = useState([
  {
    id: 1,
    name: "Keyboard",
    price: 2499,
    quantity: 2
  },
  {
    id: 2,
    name: "Mouse",
    price: 999,
    quantity: 1
  }
]);
  return (
    <BrowserRouter>
    <Navbar />
    <Routes>
      <Route path="/" element={<Home/>} />
      <Route path="/products" element={<Products/>}/>
      <Route path="/cart" element={<Cart cart={cart}/>}/>
    </Routes>
    </BrowserRouter>
  )
}

export default App;