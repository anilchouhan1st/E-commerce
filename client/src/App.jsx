import { useState } from "react";
import Navbar from "./components/Navbar"; 
import ProductCard from "./components/ProductCard";

const App =()=>{
const [cartCount, setCartCount] = useState(0);
const products = [
    {
      id: 1,
      name: "Laptop",
      price: 45000,
      image: "https://i5.walmartimages.com/asr/3c814651-0efa-4e3c-9598-efb385991581.8bd1455c08963f272709c63b7f0dbf40.jpeg"
    },
    {
      id: 2,
      name: "Headphones",
      price: 1499,
      image: "https://placehold.co/300x200?text=Headphones"
    },
    {
      id: 3,
      name: "Keyboard",
      price: 2499,
      image: "https://placehold.co/300x200?text=Keyboard"
    },
    {
      id: 4,
      name: "Smart Watch",
      price: 3499,
      image: "https://placehold.co/300x200?text=Smart+Watch"
    },
    {
      id: 5,
      name: "Gaming Mouse",
      price: 999,
      image: "https://placehold.co/300x200?text=Mouse"
    }
  ];

function handleAddToCart() {
    setCartCount(cartCount + 1);
    console.log(cartCount)
  }

  return (
    <div>
      <Navbar />
      <h1>Welcome to Anil's Store</h1>
      <p>Discover products you'll love.</p>
     
     <div className="product-container">
      {products.map((p)=>(
        <ProductCard
        key={p.id}
        name={p.name}
        price={p.price}
        image={p.image}
        onAddToCart={handleAddToCart}
        />
      ))}
     </div>
    

    </div>
  )
}

export default App;