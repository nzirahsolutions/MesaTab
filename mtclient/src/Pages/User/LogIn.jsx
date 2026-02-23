import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { currentServer } from "../../Context/urls";
import axios from 'axios';
import { jwtDecode } from "jwt-decode";
import { AuthContext } from "../../Context/AuthContext";

export default function LogIn() {
  const {setUser}= useContext(AuthContext);
  const [loading, setLoading]=useState(false);
  const [error, setError]=useState(false);
  const [success, setSuccess]=useState(false);
  const [errorMessage, setErrorMessage]=useState('Something Went Wrong');
  const [user1, setUser1]=useState({email:'',password:''});
  const navigate=useNavigate();

  function handleChange(e){
    setUser1({...user1, [e.target.name]:e.target.value});
    setError(false);
    setSuccess(false);
  }
  async function handleSubmit(e){
    e.preventDefault(); 
    setLoading(true);
    try{
        const res=await axios.post(`${currentServer}/user/login`,user1);
        localStorage.setItem('token',res.data.token);
        const userToken= jwtDecode(res.data.token);
        //console.log(userToken);//contains userInfo object and token expiry details
        // console.log(userToken.userInfo);
        setUser(userToken.userInfo);
        setLoading(false);
        setError(false);
        setSuccess(true);
        navigate('/');
    }
    catch(err){
        console.log(err);
        setLoading(false);
        setError(true);
        setErrorMessage(err?.response?.data?.message || "Unable to log in. Check your connection and try again.");
    }   
  }

  return (
    <>
    <form action="">
      <h3>Log in To MesaTab</h3>
      <input type='email' required name="email" value={user1.email} onChange={handleChange} placeholder="Enter email"/>
      <input type="password" required name="password" value={user1.password} onChange={handleChange} placeholder="Enter password"/>
      <button className="darkButton" onClick={handleSubmit} >{loading?'Logging In':'Log In'}</button>
      {error && <p>{errorMessage}</p>}
      {success && <p>Log in successful</p>}
      <p>Don't have an account? <span onClick={()=>navigate('/signup')}>Sign Up</span></p>  
    </form>
    </>
  )
}
