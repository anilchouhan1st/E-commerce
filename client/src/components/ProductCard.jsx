import "./ProductCard.css"
function ProductCard() {
    return (
        <div className="product-card"
        >
            <div className="product-image">
                product Image
            </div>

             <h3>Wireless Headphones</h3>
            <p>₹1,499</p>
            <button>Add to Cart</button>
        </div>
    )
}

export default ProductCard;