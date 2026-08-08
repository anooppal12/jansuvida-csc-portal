const express = require('express');
const { requireCustomer } = require('./auth-middleware');
const router = express.Router();
function validMobile(v){return /^[6-9]\d{9}$/.test(String(v||''));}
module.exports=(pool)=>{
 router.use(requireCustomer);
 router.get('/',async(req,res)=>{try{const [[c]]=await pool.query('SELECT id,name,mobile,email,address,pincode,created_at FROM customers WHERE id=? LIMIT 1',[req.customerId]);if(!c)return res.status(404).json({error:'Customer not found'});res.json({customer:c});}catch(e){console.error(e);res.status(500).json({error:'Unable to load profile'});}});
 router.patch('/',async(req,res)=>{try{const name=String(req.body.name||'').trim(),mobile=String(req.body.mobile||'').trim(),email=String(req.body.email||'').trim()||null,address=String(req.body.address||'').trim()||null,pincode=String(req.body.pincode||'').trim()||null;if(name.length<2||name.length>120)return res.status(400).json({error:'Valid name is required'});if(!validMobile(mobile))return res.status(400).json({error:'Valid mobile number is required'});if(pincode&& !/^\d{6}$/.test(pincode))return res.status(400).json({error:'Valid 6 digit pincode is required'});const [other]=await pool.query('SELECT id FROM customers WHERE mobile=? AND id<>? LIMIT 1',[mobile,req.customerId]);if(other.length)return res.status(409).json({error:'Mobile number is already registered'});await pool.query('UPDATE customers SET name=?,mobile=?,email=?,address=?,pincode=? WHERE id=?',[name,mobile,email,address,pincode,req.customerId]);res.json({customer:{id:req.customerId,name,mobile,email,address,pincode}});}catch(e){console.error(e);res.status(500).json({error:'Unable to update profile'});}});
 return router;
};