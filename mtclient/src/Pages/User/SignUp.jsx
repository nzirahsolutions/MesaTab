import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { currentServer } from "../../Context/urls";
import { jwtDecode } from "jwt-decode";
import axios from 'axios';
import { AuthContext } from "../../Context/AuthContext";

export default function SignUp() {
  const {setUser} = useContext(AuthContext);
  const [loading, setLoading]=useState(false);
  const [error, setError]=useState(false);
  const [success, setSuccess]=useState(false);
  const [errorMessage, setErrorMessage]=useState('Something Went Wrong');
  const [newUser, setNewUser]=useState({username:'',email:'',password:''});
  const navigate=useNavigate();

  function handleChange(e){
    setNewUser({...newUser, [e.target.name]:e.target.value});
    setError(false);
    setSuccess(false);
  }
  async function handleSubmit(e){
    e.preventDefault();
    setLoading(true); 
    try{
        const res=await axios.post(`${currentServer}/user/signup`,newUser);
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
        setErrorMessage(err.response.data.message);
    }   
  }

  return (
    <>
    <form action="">
      <h3>Sign up for MesaTab</h3>
      <input type='text' required name="username" value={newUser.username} onChange={handleChange} placeholder="Enter username"/>
      <input type='email' required name="email" value={newUser.email} onChange={handleChange} placeholder="Enter email"/>
      <input type="password" required name="password" value={newUser.password} onChange={handleChange} placeholder="Enter password"/>
      <button className="darkButton" onClick={handleSubmit} >{loading?'Signing Up':'Sign Up'}</button>
      {error && <p style={{color:'red'}}>{errorMessage}</p>}
      {success && <p style={{color:'green'}}>Sign up successful</p>}
      <p>Already have an account? <span onClick={()=>navigate('/login')}>Log In</span></p>  
    </form>
    </>
  )
}
