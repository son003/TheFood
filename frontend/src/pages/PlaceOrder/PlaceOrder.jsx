import React, { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './PlaceOrder.css';
import { StoreContext } from '../../context/StoreContext';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';

const PlaceOrder = () => {
  const location = useLocation();
  const { voucherCode, voucherDiscount, maximumDiscount, note: cartNote } = location.state || {};
  const { getTotalCartAmount, token, url, food_list, cartItems } = useContext(StoreContext);
  const [data, setData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    state: "",
    zipcode: "",
    address: "",
    phone: "",
    note: cartNote || "" // Initialize note with cartNote if available
  });

  const [formErrors, setFormErrors] = useState({
    firstName: "",
    lastName: "",
    email: "",
    state: "",
    zipcode: "",
    phone: "",
    address: "",
  });

  const [isFormValid, setIsFormValid] = useState(false); // To track if form is valid
  const navigate = useNavigate();

  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("Error decoding token", e);
      return null;
    }
  };

  const getUserIdFromToken = () => {
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken = parseJwt(token);
      return decodedToken ? decodedToken.id : null;
    }
    return null;
  };

  const userId = getUserIdFromToken();

  useEffect(() => {
    if (!userId) {
      toast.error('User not authenticated.');
      navigate('/cart');
      return;
    }

    const fetchUserData = async () => {
      try {
        const response = await axios.get(`${url}/api/user/${userId}`);
        if (response.data.success) {
          const userData = response.data.data;
          setData((prevData) => ({
            ...prevData,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            email: userData.email || '',
            address: userData.address || '',
            state: userData.state || '',
            zipcode: userData.zipcode || '',
            phone: userData.phone || ''
          }));
        } else {
          toast.error('Failed to fetch user data.');
        }
      } catch (err) {
        console.error(err);
        toast.error('An error occurred while fetching user data.');
      }
    };

    fetchUserData();
  }, [userId, url, navigate]);

  useEffect(() => {
    validateForm();
  }, [data, formErrors]);

  const onChangeHandler = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setData((prevData) => ({ ...prevData, [name]: value }));
    validateForm(); // Validate after every change
  };

  const validateForm = () => {
    let errors = { ...formErrors };
    let isValid = true;

    // Validate first name
    if (!data.firstName) {
      errors.firstName = 'Please fill in your first name';
      isValid = false;
    } else {
      errors.firstName = '';
    }

    // Validate last name
    if (!data.lastName) {
      errors.lastName = 'Please fill in your last name';
      isValid = false;
    } else {
      errors.lastName = '';
    }

    // Validate email
    if (!data.email) {
      errors.email = 'Please fill in your email';
      isValid = false;
    } else {
      errors.email = '';
    }

    // Validate state
    if (!data.state) {
      errors.state = 'Please fill in your state';
      isValid = false;
    } else {
      errors.state = '';
    }

    // Validate zipcode
    if (!/^\d+$/.test(data.zipcode)) {
      errors.zipcode = 'Zip code must contain only numbers';
      isValid = false;
    } else if (!data.zipcode) {
      errors.zipcode = 'Please fill in your zip code';
      isValid = false;
    } else {
      errors.zipcode = '';
    }

    // Validate phone number
    if (!/^\d{10}$/.test(data.phone)) {
      errors.phone = 'Phone number must be exactly 10 digits';
      isValid = false;
    } else if (!data.phone) {
      errors.phone = 'Please fill in your phone number';
      isValid = false;
    } else {
      errors.phone = '';
    }

    // Validate address
    if (!data.address) {
      errors.address = 'Please fill in your address';
      isValid = false;
    } else {
      errors.address = '';
    }

    setFormErrors(errors);

    // Check if all required fields are filled and there are no errors
    setIsFormValid(isValid); // Set the form validity
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`${url}/api/user/update/${userId}`, data);
      if (response.data.success) {
        toast.success('Customer information updated successfully!');
      } else {
        toast.error('Failed to update customer information.');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred while updating the customer information.');
    }
  };

  const placeOrder = async (event) => {
    event.preventDefault();

    // Check if the cart is empty
    if (Object.keys(cartItems).length === 0 || getTotalCartAmount() === 0) {
      toast.error("Your cart is empty. Please add items to proceed.");
      return;
    }

    if (!isFormValid) {
      toast.error('Please fill in all the required fields correctly.');
      return;
    }

    await handleSubmit(event);

    let orderItems = [];
    food_list.forEach((item) => {
      if (cartItems[item._id]) {
        let itemInfo = item;
        itemInfo["quantity"] = cartItems[item._id];
        orderItems.push(itemInfo);
      }
    });

    let orderData = {
      address: data,
      items: orderItems,
      amount: getTotalCartAmount() + 2,
      note: data.note
    };

    try {
      const response = await axios.post(url + "/api/order/place", orderData, { headers: { token } });
      if (response.data.success) {
        const { session_url } = response.data;
        window.location.replace(session_url);
      } else {
        toast.error("Error placing the order. Please try again.");
      }
    } catch (error) {
      console.error("Order placement error:", error);
      toast.error("An error occurred while placing the order.");
    }
  };

  const discountAmount = () => {
    const subtotal = getTotalCartAmount();
    const deliveryFee = subtotal === 0 ? 0 : 2;
    const discountAmount = Math.min((subtotal + deliveryFee) * (voucherDiscount / 100), maximumDiscount);
    return discountAmount;
  };

  const calculateTotal = () => {
    const subtotal = getTotalCartAmount();
    const deliveryFee = subtotal === 0 ? 0 : 2;
    const total = subtotal + deliveryFee - discountAmount();
    return total;
  };

  return (
    <form onSubmit={placeOrder} className='place-order'>
      <ToastContainer />
      <div className="place-order-left">
        <p className="title">Delivery Information</p>
        <div className="multi-fields">
          <input
            required
            name='firstName'
            onChange={onChangeHandler}
            value={data.firstName}
            type="text"
            placeholder='First name'
          />
          {formErrors.firstName && <p className="error">{formErrors.firstName}</p>}
          <input
            required
            name='lastName'
            onChange={onChangeHandler}
            value={data.lastName}
            type="text"
            placeholder='Last name'
          />
          {formErrors.lastName && <p className="error">{formErrors.lastName}</p>}
        </div>
        <input
          required
          name='email'
          value={data.email}
          type="email"
          placeholder='Email address'
          readOnly // This makes the email field uneditable
        />
        {formErrors.email && <p className="error">{formErrors.email}</p>}
        <div className="multi-fields">
          <input
            required
            name='state'
            onChange={onChangeHandler}
            value={data.state}
            type="text"
            placeholder='State'
          />
          {formErrors.state && <p className="error">{formErrors.state}</p>}
        </div>
        <div className="multi-fields">
          <input
            required
            name='zipcode'
            onChange={onChangeHandler}
            value={data.zipcode}
            type="text"
            placeholder='Zip code'
          />
          {formErrors.zipcode && <p className="error">{formErrors.zipcode}</p>}
        </div>
        <div className="multi-fields">
          <input
            required
            name='phone'
            onChange={onChangeHandler}
            value={data.phone}
            type="text"
            placeholder='Phone'
          />
          {formErrors.phone && <p className="error">{formErrors.phone}</p>}
        </div>
        <div className="multi-fields">
          <input
            required
            name='address'
            onChange={onChangeHandler}
            value={data.address}
            type="text"
            placeholder='Address'
          />
          {formErrors.address && <p className="error">{formErrors.address}</p>}
        </div>
        <div className="cart-note">
          <label htmlFor="note">Add a note to your order:</label>
          <textarea
            id="note"
            name="note"
            value={data.note}
            onChange={onChangeHandler}
            placeholder="Enter your note here..."
          ></textarea>
        </div>
      </div>
      <div className="place-order-right">
        <div className="cart-total">
          <h2>Cart Totals</h2>
          <div>
            <div className="cart-total-details">
              <p>Subtotal</p>
              <p>${getTotalCartAmount()}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <p>Delivery Fee</p>
              <p>${getTotalCartAmount() === 0 ? 0 : 2}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <p>Voucher: ({voucherDiscount}%)</p>
              <p>${discountAmount()}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <b>Total</b>
              <p>${calculateTotal()}</p>
            </div>
            <hr />
            <div className="cart-note">
              <label htmlFor="note">Note:</label>
              <p>{data.note}</p>
            </div>
          </div>
          <button type='submit' disabled={!isFormValid}>PROCESS TO PAYMENT</button>
        </div>
      </div>
    </form>
  );
};

export default PlaceOrder;
