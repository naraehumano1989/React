import { collection, query, where, documentId, getDocs, writeBatch, addDoc } from "firebase/firestore"
import { useCart } from "../../context/CartContext"
import { db } from "../../services/firebase/FirebaseConfig"
import { useState } from 'react'
import { useNotification } from "../../notification/NotificationService"

import { useNavigate } from "react-router-dom"
import ContactForm from "../ContactForm/ContactForm"

const Checkout = () => {
    const [orderId, setOrderId] = useState('')
    const [loading, setLoading] = useState(false)
    const { cart, total, clearCart } = useCart()

    const { setNotification } = useNotification()

    const navigate = useNavigate()

    const createOrder = async (userData) => {
        try {
            setLoading(true)
            const objOrder = {
                buyer: userData,
                items: cart,
                total
            }
    
            const ids = cart.map(prod => prod.id)
    
            const productsRef = query(collection(db, 'products'), where(documentId(), 'in', ids))
    
            const { docs } = await getDocs(productsRef)
            
            const batch = writeBatch(db)
            const outOfStock = []
    
            docs.forEach(doc => {
                const dataDoc = doc.data()
                const stockDb = dataDoc.stock
    
                const productAddedToCart = cart.find(prod => prod.id === doc.id)
                const prodQuantity = productAddedToCart?.quantity
    
                if(stockDb >= prodQuantity) {
                    batch.update(doc.ref, { stock: stockDb - prodQuantity})
                } else {
                    outOfStock.push({ id: doc.id, ...dataDoc})
                }
            })
    
            if(outOfStock.length === 0) {
                batch.commit()
    
                const ordersRef = collection(db, 'orders')
    
                const orderAdded = await addDoc(ordersRef, objOrder)
                
                clearCart()
                setOrderId(orderAdded.id)

                setTimeout(() => {
                    navigate('/')
                }, 5000)
            } else {
                setNotification('error', 'Hay productos que no tienen stock', 10)
            }
        } catch (error) {
            setNotification('error', 'Hubo un error generando la orden', 10)
        } finally {
            setLoading(false)
        }
        
    }

    if(loading) {
        return (
            <div>
                <h1 className="text-white mb-10">Se esta generando su orden...</h1>
            </div>
        )
    }

    if(orderId) {
        return (
            <div>
                <h1 className="text-white mb10">El id de su compra es: <span className="text-green-700">{orderId}</span></h1>
            </div>
        )
    }

    return (
        <div className="bg-white">
            <h1 className="text-5xl text-amber-700">Checkout</h1>
            <h2 className="text-3xl text-amber-700">Ingrese sus datos</h2>
            <ContactForm onConfirm={createOrder} lassName="bg-orange-300 hover:bg-teal-400 text-white p-2 mt-5"/>
        </div>
    )
}

export default Checkout