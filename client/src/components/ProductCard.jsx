
import "./ProductCard.css"
function ProductCard(props) {
    return (
        <div className="product-card"
        >
             <img
                src={props.image}
                alt={props.name}
                className="product-image"
            />

             <h3>{props.name}</h3>
            <p>{props.price}</p>
            <button onClick={props.onAddToCart}>Add to Cart</button>
        </div>
    )
}

export default ProductCard;