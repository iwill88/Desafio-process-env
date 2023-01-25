class Database {
    constructor (id) {
        this.id = id,
        this.database = [
    
            {
                title:"Escuadra",
                price:123,
                thumbnail:"https://cdn3.iconfinder.com/data/icons/education-209/64/ruler-triangle-stationary-school-256.png",
                id:1
            },
            {
                title:"Calculadora",
                price:234,
                thumbnail:"https://cdn3.iconfinder.com/data/icons/education-209/64/calculator-math-tool-school-256.png",
                id:2
            },
            {
                title:"Globo Terráqueo",
                price:345,
                thumbnail:"https://cdn3.iconfinder.com/data/icons/education-209/64/globe-earth-geograhy-planet-school-256.png",
                id:3
            }
        
        ]
    }


    getAll(){
        
        return this.database;
    }

    save(newProduct) {
        let product = {
            ...newProduct,
            id: this.database.length+1
        }
        this.database.push(product);
        return product
    }

}

module.exports = Database;