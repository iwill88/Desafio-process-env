const { Router } = require('express');
const {fork} = require('child_process');
const express = require('express');
const app = express();
app.use(express.json());


const randomsRouter = Router();

randomsRouter.get('/', (req,res) => {
    const child = fork('./operationRandom.js')
    let cant=req.query.cant
    if(!cant){
        cant=100000000
    }
    child.send(cant);
    child.on('message', msg => {
            console.log("mensaje final",msg)
            res.json(msg)
    })

})

module.exports = randomsRouter