import Navbar from "./components/Navbar"; 
import ProductCard from "./components/ProductCard";

const App =()=>{
  return (
    <div>
      <Navbar />
      <h1>Welcome to Anil's Store</h1>
      <p>Discover products you'll love.</p>
      
      <ProductCard/>
    </div>
  )
}

export default App;