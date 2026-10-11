import "./Navbar.css"
import { Link } from "react-router";

function Navbar() {
    return (
        <>
            <div className="navBar">
                <img className="logo" src='/images/logo.png' alt="logo" />
                <p>Apartment Maintenance Services</p>
                <div className="main-nav">
                    <Link to="/"></Link>
                </div>
            </div>
        
        </>
    )
}

export default Navbar;