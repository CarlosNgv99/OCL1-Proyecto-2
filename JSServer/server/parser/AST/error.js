class Error {
    constructor(description, row, column) {
        this.description = description;
        this.row = row;
        this.column = column;
    }
    
}

module.exports = Error;