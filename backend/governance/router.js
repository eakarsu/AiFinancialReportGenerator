const express=require('express');
const jwt=require('jsonwebtoken');
const pool=require('../src/config/database');
const {createWorkflow}=require('./workflowCore');
const {createGovernedRouter}=require('./routerFactory');
const authMiddleware=async(req,res,next)=>{const header=String(req.headers.authorization||'');if(!header.startsWith('Bearer '))return res.status(401).json({error:'AUTHENTICATION_REQUIRED'});try{const payload=jwt.verify(header.slice(7),process.env.JWT_SECRET);const actorId=String(payload.sub||payload.id||'');if(!actorId||actorId==='demo-user')return res.status(401).json({error:'IDENTITY_NOT_ACTIVE'});const result=await pool.query('SELECT id FROM users WHERE id::text=$1 LIMIT 1',[actorId]);if(!result.rows[0])return res.status(401).json({error:'IDENTITY_NOT_ACTIVE'});req.user={id:String(result.rows[0].id)};next();}catch(_error){return res.status(401).json({error:'INVALID_OR_EXPIRED_TOKEN'});}};
const db={query:async(sql,params)=>(await pool.query(sql,params)).rows,transaction:async(work)=>{const client=await pool.connect();try{await client.query('BEGIN');const result=await work(async(sql,params)=>(await client.query(sql,params)).rows);await client.query('COMMIT');return result;}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}}};
module.exports=createGovernedRouter({express,workflow:createWorkflow(require('./config')),auth:authMiddleware,db});
