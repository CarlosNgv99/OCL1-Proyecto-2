var Error = require("./error");
const graphviz = require("graphviz");
var util = require("util");

class Parser {
  constructor(tokenList) {
    this.tokenList = tokenList;
    this.preAnalysis = tokenList[0];
    this.numPreAnalysis = 0;
    this.errorList = [];
    this.stringTraduccion = "";
    this.defFound = false;
    this.contTab = 0;
    this.elifFound = false;
    this.mainFound = false;
    this.auxMain = "";
    this.llamadaMetodo = false;
    this.forFound = false;
    this.forValue1 = "";
    this.forValue2 = "";
    this.errorFound = false;
    this.graph = "";
    this.g = graphviz.graph("G");
  }

  parse() {
    this.Inicio();
  }

  Inicio() {
    this.g.addNode("Inicio");
    if (this.preAnalysis.type == "RESERVED_PUBLIC") {
      this.match("RESERVED_PUBLIC");
      if (this.preAnalysis.type == "RESERVED_CLASS") {
        // 'public' SENTENCIA_CLASE LISTA_CLASES 'ultimo'
        this.g.addNode('SentenciaClase');
        this.g.addEdge("Inicio", 'SentenciaClase');
        this.SentenciaClase();
        this.ListaClases();
        this.Inicio();
        //this.match("LAST");
      } else if (this.preAnalysis.type == "RESERVED_INTERFACE") {
        // 'public' SENTENCIA_INTERFAZ LISTA_INTERFACES 'ultimo'
        this.SentenciaInterfaz();
        this.ListaInterfaces();
        this.Inicio();
        //this.match("LAST");
      }
    } else {
      this.match("LAST");
      this.g.setGraphVizPath("/usr/local/bin");
      this.g.output("pdf", "ast.pdf");
    }
  }

  SentenciaClase() {
    // public class { LISTA_DECLARACION_METODOS_FUNCIONES }
    this.stringTraduccion += this.preAnalysis.value + " ";
    this.g.addNode(this.preAnalysis.value);
    this.g.addEdge("Raíz", this.preAnalysis.value);
    this.match("RESERVED_CLASS");
    this.stringTraduccion += this.preAnalysis.value;
    this.g.addNode(this.preAnalysis.value);
    let fatherAux =  this.preAnalysis.value;
    this.g.addEdge(this.tokenList[this.numPreAnalysis - 1].value, this.preAnalysis.value);
    this.match("ID");
    this.stringTraduccion += ":\n";
    this.g.addNode(this.preAnalysis.value);
    this.g.addEdge(this.tokenList[this.numPreAnalysis - 1].value, this.preAnalysis.value);
    this.match("LEFT_BRACE");
    this.contTab++; // Indenta contenido dentro de la clase
    this.ListaDeclaracionMetodosFunciones();
    this.stringTraduccion += "\n";
    this.g.addNode(this.preAnalysis.value);
    this.g.addEdge(fatherAux, this.preAnalysis.value);
    this.match("RIGHT_BRACE");
    this.contTab--; // Indenta contenido para manterner clases aisladas
  }

  ListaClases() {
    this.Comentario();
    // SENTENCIA_CLASE LISTA_CLASES
    if (this.preAnalysis.type == "RESERVED_PUBLIC") {
      this.tabular();
      this.match("RESERVED_PUBLIC");
      this.SentenciaClase();
      this.ListaClases();
    }
  }

  SentenciaInterfaz() {
    // 'interface' id '{' LISTA_DECLARACION_METODOS'}'
    this.stringTraduccion += "class ";
    this.match("RESERVED_INTERFACE");
    this.stringTraduccion += this.preAnalysis.value;
    this.match("ID");
    this.stringTraduccion += ":\n";
    this.match("LEFT_BRACE");
    this.contTab++; // Indenta contenido dentro de la clase
    this.ListaDeclaracionFunciones();
    this.match("RIGHT_BRACE");
    this.contTab--; // Indenta contenido para manterner clases aisladas
  }

  ListaInterfaces() {
    this.Comentario();
    if (this.preAnalysis.type == "RESERVED_INTERFACE") {
      this.tabular();
      this.SentenciaInterfaz();
      this.ListaInterfaces();
    }
  }

  ListaDeclaracionMetodosFunciones() {
    this.Comentario();
    if (this.preAnalysis.type == "RESERVED_PUBLIC") {
      this.DeclaracionMetodosFunciones();
      this.ListaDeclaracionMetodosFunciones();
    } else if (
      (this.preAnalysis.type == "SEMICOLON" ||
        this.preAnalysis.type == "RIGHT_BRACE") &&
      this.errorFound == true
    ) {
      this.errorFound = false;
      let newError = new Error('Se recuperó con el simpolo ; o } en la fila ' + this.preAnalysis.row);
      this.errorList.push(newError);
      this.numPreAnalysis++;
      this.preAnalysis = this.tokenList[this.numPreAnalysis];
      this.DeclaracionMetodosFunciones();
      this.ListaDeclaracionMetodosFunciones();
    }
  }

  ListaDeclaracionFunciones() {
    this.Comentario();
    if (this.preAnalysis.type == "RESERVED_PUBLIC") {
      this.DeclaracionFunciones();
      this.ListaDeclaracionFunciones();
    }
  }

  DeclaracionMetodosFunciones() {
    this.Comentario();
    this.tabular(); // ESTE ES FIJO
    this.match("RESERVED_PUBLIC");
    if (this.preAnalysis.type == "RESERVED_VOID") {
      this.stringTraduccion += "def ";
      this.defFound = true;
      this.match("RESERVED_VOID");
    } else if (this.preAnalysis.type == "RESERVED_STATIC") {
      this.match("RESERVED_STATIC");
      this.mainFound = true;
      this.SentenciaMain();
      return;
    } else if (
      this.preAnalysis.type != "RESERVED_VOID" &&
      this.preAnalysis.type != "RESERVED_STATIC"
    ) {
      this.defFound = true;
      this.stringTraduccion += "def ";
      this.Tipo();
      this.defFound = false;
    }
    this.stringTraduccion += this.preAnalysis.value;
    this.match("ID");
    this.stringTraduccion += this.preAnalysis.value;
    this.match("LEFT_PARENT");
    this.DeclaracionParametros();
  }

  DeclaracionFunciones() {
    this.Comentario();
    this.tabular(); // ESTE ES FIJO
    this.match("RESERVED_PUBLIC");
    this.stringTraduccion += "self ";
    this.match("RESERVED_VOID");
    this.stringTraduccion += this.preAnalysis.value;
    this.match("ID");
    this.stringTraduccion += this.preAnalysis.value;
    this.match("LEFT_PARENT");
    this.DeclaracionParametrosInterfaz();
  }

  DeclaracionParametrosInterfaz() {
    if (this.preAnalysis == "RIGHT PARENT") {
      this.stringTraduccion += this.preAnalysis.value;
      this.match("RIGHT_PARENT");
      this.stringTraduccion = this.preAnalysis.value + "\n";
      this.match("SEMICOLON");
    } else {
      this.Tipo();
      this.stringTraduccion += this.preAnalysis.value;
      this.match("ID");
      this.ListaParametros();
      this.stringTraduccion += this.preAnalysis.value;
      this.match("RIGHT_PARENT");
      this.stringTraduccion += this.preAnalysis.value + "\n";
      this.match("SEMICOLON");
    }
  }

  DeclaracionParametros() {
    if (
      this.preAnalysis.type == "RIGHT_PARENT" &&
      this.llamadaMetodo == false
    ) {
      this.stringTraduccion += this.preAnalysis.value + ":\n";
      this.match("RIGHT_PARENT");
      this.ListaInstrLlaves();
    } else if (
      this.llamadaMetodo == false &&
      this.preAnalysis.type != "RIGHT_PARENT"
    ) {
      this.Tipo();
      this.stringTraduccion += this.preAnalysis.value;
      this.match("ID");
      this.ListaParametros();
      this.stringTraduccion += this.preAnalysis.value + ":\n";
      this.match("RIGHT_PARENT");
      this.ListaInstrLlaves();
    } else if (
      this.llamadaMetodo == true &&
      this.preAnalysis.type == "RIGHT_PARENT"
    ) {
      this.stringTraduccion += this.preAnalysis.value + "\n";
      this.match("RIGHT_PARENT");
      this.llamadaMetodo = false;
    } else if (
      this.llamadaMetodo == true &&
      this.preAnalysis.type != "RIGHT_PARENT"
    ) {
      this.Tipo();
      this.stringTraduccion += this.preAnalysis.value;
      this.match("ID");
      this.ListaParametros();
      this.stringTraduccion += this.preAnalysis.value + "\n";
      this.match("RIGHT_PARENT");
      this.llamadaMetodo = false;
    }
  }

  ListaParametros() {
    if (this.preAnalysis.type == "COMMA") {
      this.stringTraduccion += this.preAnalysis.value + " ";
      this.match("COMMA");
      this.Tipo();
      this.stringTraduccion += this.preAnalysis.value;
      this.match("ID");
      this.ListaParametros();
    }
  }

  Tipo() {
    if (this.preAnalysis.type == "RESERVED_INT") {
      if (this.forFound != true && this.defFound != true) {
        this.stringTraduccion += "var ";
      }
      this.match("RESERVED_INT");
    } else if (this.preAnalysis.type == "RESERVED_BOOLEAN") {
      if (this.forFound != true || this.defFound != true) {
        this.stringTraduccion += "var ";
      }
      this.match("RESERVED_BOOLEAN");
    } else if (this.preAnalysis.type == "RESERVED_DOUBLE") {
      if (this.forFound != true || this.defFound != true) {
        this.stringTraduccion += "var ";
      }
      this.match("RESERVED_DOUBLE");
    } else if (this.preAnalysis.type == "RESERVED_STRING") {
      if (this.forFound != true || this.defFound != true) {
        this.stringTraduccion += "var ";
      }
      this.match("RESERVED_STRING");
    } else if (this.preAnalysis.type == "RESERVED_CHAR") {
      if (this.forFound != true || this.defFound != true) {
        this.stringTraduccion += "var ";
      }
      this.match("RESERVED_CHAR");
    }
  }

  Instruccion() {
    this.Comentario();
    if (this.preAnalysis.type == "RESERVED_IF") {
      this.tabular();
      this.SentenciaIf();
    } else if (this.preAnalysis.type == "RESERVED_WHILE") {
      this.tabular();
      this.SentenciaWhile();
    } else if (this.preAnalysis.type == "RESERVED_DO") {
      this.tabular();
      this.SentenciaDoWhile();
    } else if (this.preAnalysis.type == "RESERVED_FOR") {
      this.tabular();
      this.SentenciaFor();
    } else if (this.preAnalysis.type == "RESERVED_SYSTEM") {
      this.tabular();
      this.SentenciaPrint();
    } else if (this.preAnalysis.type == "RESERVED_CONTINUE") {
      this.tabular();
      this.SentenciaContinue();
    } else if (this.preAnalysis.type == "RESERVED_BREAK") {
      this.tabular();
      this.SentenciaBreak();
    } else if (
      this.preAnalysis.type == "RESERVED_PUBLIC" &&
      this.tokenList[this.numPreAnalysis + 1].type == "RESERVED_STATIC"
    ) {
      this.tabular();
      this.SentenciaMain();
    } else if (
      this.preAnalysis.type == "RESERVED_RETURN" &&
      this.tokenList[this.numPreAnalysis + 1].type == "SEMICOLON"
    ) {
      this.tabular();
      this.SentenciaReturnMetodos();
    } else if (
      this.preAnalysis.type == "RESERVED_RETURN" &&
      this.tokenList[this.numPreAnalysis + 1].type != "SEMICOLON"
    ) {
      this.tabular();
      this.SentenciaReturnFunciones();
    } else if (
      this.preAnalysis.type == "ID" &&
      this.tokenList[this.numPreAnalysis + 1].type == "LEFT_PARENT"
    ) {
      this.tabular();
      this.LlamadaMetodo();
    } else if (
      this.preAnalysis.type == "ID" &&
      this.tokenList[this.numPreAnalysis + 1].type == "EQUALS_SIGN"
    ) {
      this.tabular();
      this.AsignacionSimple();
    } else if (
      this.preAnalysis.type == "RESERVED_INT" ||
      this.preAnalysis.type == "RESERVED_CHAR" ||
      this.preAnalysis.type == "RESERVED_BOOLEAN" ||
      this.preAnalysis.type == "RESERVED_STRING" ||
      this.preAnalysis.type == "RESERVED_DOUBLE"
    ) {
      this.tabular();
      this.DeclaracionVariable();
    }
  }

  ListaInstrucciones() {
    this.Instruccion();
    this.ListaInstruccionesP();
  }

  ListaInstruccionesP() {
    this.Comentario();
    if (this.preAnalysis.type == "RESERVED_IF") {
      this.Instruccion();
      this.ListaInstruccionesP();
    } else if (this.preAnalysis.type == "RESERVED_WHILE") {
      this.Instruccion();
      this.ListaInstruccionesP();
    } else if (this.preAnalysis.type == "RESERVED_FOR") {
      this.Instruccion();
      this.ListaInstruccionesP();
    } else if (this.preAnalysis.type == "RESERVED_DO") {
      this.Instruccion();
      this.ListaInstruccionesP();
    } else if (this.preAnalysis.type == "RESERVED_SYSTEM") {
      this.Instruccion();
      this.ListaInstruccionesP();
    } else if (this.preAnalysis.type == "RESERVED_BREAK") {
      this.Instruccion();
      this.ListaInstruccionesP();
    } else if (this.preAnalysis.type == "RESERVED_CONTINUE") {
      this.Instruccion();
      this.ListaInstruccionesP();
    } else if (
      this.preAnalysis.type == "RESERVED_PUBLIC" &&
      this.tokenList[this.numPreAnalysis + 1].type == "RESERVED_STATIC"
    ) {
      this.Instruccion();
      this.ListaInstruccionesP();
    } else if (
      this.preAnalysis.type == "RESERVED_RETURN" &&
      this.tokenList[this.numPreAnalysis + 1].type == "SEMICOLON"
    ) {
      this.Instruccion();
      this.ListaInstruccionesP();
    } else if (
      this.preAnalysis.type == "RESERVED_RETURN" &&
      this.tokenList[this.numPreAnalysis + 1].type != "SEMICOLON"
    ) {
      this.Instruccion();
      this.ListaInstruccionesP();
    } else if (
      this.preAnalysis.type == "ID" &&
      this.tokenList[this.numPreAnalysis + 1].type == "LEFT_PARENT"
    ) {
      this.Instruccion();
      this.ListaInstruccionesP();
    } else if (
      this.preAnalysis.type == "ID" &&
      this.tokenList[this.numPreAnalysis + 1].type == "EQUALS_SIGN"
    ) {
      this.Instruccion();
      this.ListaInstruccionesP();
    } else if (
      this.preAnalysis.type == "RESERVED_INT" ||
      this.preAnalysis.type == "RESERVED_CHAR" ||
      this.preAnalysis.type == "RESERVED_BOOLEAN" ||
      this.preAnalysis.type == "RESERVED_STRING" ||
      this.preAnalysis.type == "RESERVED_DOUBLE"
    ) {
      this.Instruccion();
      this.ListaInstruccionesP();
    } else if (
      (this.preAnalysis.type == "SEMICOLON" ||
        this.preAnalysis.type == "RIGHT_BRACE") &&
      this.errorFound == true
    ) {
      this.errorFound = false;
      let newError = new Error('Se recuperó con el simpolo ; o } en la fila ' + this.preAnalysis.row);
      this.errorList.push(newError);
      this.numPreAnalysis++;
      this.preAnalysis = this.tokenList[this.numPreAnalysis];
      this.Instruccion();
      this.ListaInstruccionesP();
    } 
  }

  ListaInstrLlaves() {
    this.match("LEFT_BRACE");
    this.contTab++;
    this.ListaInstrucciones();
    this.stringTraduccion += "\n";
    this.match("RIGHT_BRACE");
    this.contTab--;
  }

  SentenciaReturnMetodos() {
    this.stringTraduccion += this.preAnalysis.value;
    this.match("RESERVED_RETURN");
    this.E(); // Podría omitirse
    this.match("SEMICOLON");
  }

  SentenciaReturnFunciones() {
    this.stringTraduccion += this.preAnalysis.value + " ";
    this.match("RESERVED_RETURN");
    this.E();
    this.match("SEMICOLON");
  }

  AsignacionSimple() {
    this.stringTraduccion += this.preAnalysis.value + " ";
    this.match("ID");
    this.AsignacionSimpleP();
  }

  AsignacionSimpleP() {
    this.stringTraduccion += this.preAnalysis.value + " ";
    this.match("EQUALS_SIGN");
    this.E();
    this.match("SEMICOLON");
  }

  Asignacion() {
    this.Comentario();
    if (this.preAnalysis.type == "EQUALS_SIGN") {
      this.stringTraduccion += this.preAnalysis.value + " ";
      this.match("EQUALS_SIGN");
      this.E();
      this.stringTraduccion += "\n";
      this.match("SEMICOLON");
    }
  }

  DeclaracionVariable() {
    this.Comentario();
    this.Tipo();
    this.stringTraduccion += this.preAnalysis.value + " ";
    this.match("ID");
    this.DeclaracionVariableP();
  }

  DeclaracionVariableP() {
    this.ListaID();
    this.Asignacion();
  }

  ListaID() {
    if (this.preAnalysis.type == "COMMA") {
      this.stringTraduccion += this.preAnalysis.value + " ";
      this.match("COMMA");
      this.stringTraduccion += this.preAnalysis.value;
      this.match("ID");
      this.ListaID();
    }
  }

  LlamadaMetodo() {
    this.llamadaMetodo = true;
    this.stringTraduccion += this.preAnalysis.value;
    this.match("ID");
    this.stringTraduccion += this.preAnalysis.value;
    this.match("LEFT_PARENT");
    this.DeclaracionParametros();
    this.match("SEMICOLON");
  }

  SentenciaMain() {
    this.match("RESERVED_VOID");
    this.match("RESERVED_MAIN");
    this.match("LEFT_PARENT");
    this.match("RESERVED_STRING");
    this.match("LEFT_BRACKET");
    this.match("RIGHT_BRACKET");
    this.match("RESERVED_ARGS");
    this.match("RIGHT_PARENT");
    this.stringTraduccion += "def main():\n";
    this.auxMain = "\tif __name__ = “__main__”:\n \t\tmain()\n";
    this.ListaInstrLlaves();
    this.stringTraduccion += this.auxMain;
    this.auxMain = "";
  }

  SentenciaContinue() {
    this.stringTraduccion += "continue";
    this.match("RESERVED_CONTINUE");
    this.match("SEMICOLON");
  }

  SentenciaBreak() {
    this.stringTraduccion += "break";
    this.match("RESERVED_BREAK");
    this.match("SEMICOLON");
  }

  Comentario() {
    while (
      this.preAnalysis.type == "MULTILINE_COMMENT" ||
      this.preAnalysis.type == "COMMENT"
    ) {
      if (this.preAnalysis.type == "MULTILINE_COMMENT") {
        this.preAnalysis.value = this.preAnalysis.value.replace("/*", "#");
        this.preAnalysis.value = this.preAnalysis.value.replace("*/", "");
        this.tabular();
        this.stringTraduccion += this.preAnalysis.value + "\n";
      } else if (this.preAnalysis.type == "COMMENT") {
        this.preAnalysis.value = this.preAnalysis.value.replace("//", "#");
        this.tabular();
        this.stringTraduccion += this.preAnalysis.value + "\n";
      }
      this.numPreAnalysis++;
      this.preAnalysis = this.tokenList[this.numPreAnalysis];
    }
  }

  SentenciaPrint() {
    this.match("RESERVED_SYSTEM");
    this.match("DOT");
    this.match("RESERVED_OUT");
    this.match("DOT");
    this.stringTraduccion += "print";
    this.match("RESERVED_PRINTLN");
    this.stringTraduccion += this.preAnalysis.value;
    this.match("LEFT_PARENT");
    this.stringTraduccion += this.preAnalysis.value;
    this.match("STRING");
    this.stringTraduccion += this.preAnalysis.value + "\n";
    this.match("RIGHT_PARENT");
    this.match("SEMICOLON");
  }

  SentenciaWhile() {
    this.stringTraduccion += this.preAnalysis.value + " ";
    this.match("RESERVED_WHILE");
    this.match("LEFT_PARENT");
    this.Expresion();
    this.stringTraduccion += ":\n";
    this.match("RIGHT_PARENT");
    this.ListaInstrLlaves();
  }

  SentenciaIf() {
    if (this.elifFound != true) {
      this.stringTraduccion += this.preAnalysis.value + " ";
    } else {
    }
    this.match("RESERVED_IF");
    this.match("LEFT_PARENT");
    this.Expresion();
    this.stringTraduccion += ":\n";
    this.match("RIGHT_PARENT");
    this.ListaInstrLlaves();
    this.OpcionElse();
  }

  OpcionElse() {
    if (this.preAnalysis.type == "RESERVED_ELSE") {
      this.match("RESERVED_ELSE");
      this.ListaIf();
    }
  }

  ListaIf() {
    if (this.preAnalysis.type == "LEFT_BRACE") {
      this.tabular();
      this.stringTraduccion += "else:\n";
      this.ListaInstrLlaves();
    }
    if (this.preAnalysis.type == "RESERVED_IF") {
      this.tabular();
      this.stringTraduccion += "elif ";
      this.elifFound = true;
      this.SentenciaIf();
    }
  }

  SentenciaDoWhile() {
    this.match("RESERVED_DO");
    this.ListaInstrLlaves();
    this.match("RESERVED_WHILE");
    this.match("LEFT_PARENT");
    this.stringTraduccion += "while ";
    this.Expresion();
    this.match("RIGHT_PARENT");
  }

  SentenciaFor() {
    this.forFound = true;
    this.stringTraduccion += "for ";
    this.match("RESERVED_FOR");
    this.match("LEFT_PARENT");
    this.DeclaracionFor();
    this.stringTraduccion += "in range(" + this.forValue1 + ",";
    this.match("SEMICOLON");
    this.Expresion();
    this.stringTraduccion += this.forValue2 + "):\n";
    this.match("SEMICOLON");
    this.match("ID");
    this.IncrementoDecremento();
    this.match("RIGHT_PARENT");
    this.forValue1 = "";
    this.forValue2 = "";
    this.forFound = false;
    this.ListaInstrLlaves();
  }

  DeclaracionFor() {
    if (this.preAnalysis.type == "ID") {
      this.stringTraduccion += this.preAnalysis.value + " ";
      this.match("ID");
      this.match("EQUALS_SIGN");
      this.E();
    } else {
      this.Tipo();
      this.stringTraduccion += this.preAnalysis.value + " ";
      this.match("ID");
      this.match("EQUALS_SIGN");
      this.E();
    }
  }

  IncrementoDecremento() {
    if (this.preAnalysis.type == "INCREMENT_OPT") {
      this.match("INCREMENT_OPT");
    } else {
      this.match("DECREMENT_OPT");
    }
  }

  Expresion() {
    this.OperadorNot();
    this.E();
    this.Condicion();
    this.CondicionLogica();
  }

  OperadorNot() {
    if (this.preAnalysis.type == "NOT_OPT") {
      this.stringTraduccion += "not ";
      this.match("NOT_OPT");
    }
  }

  Condicion() {
    if (this.preAnalysis.type == "AND_OPT") {
      this.stringTraduccion += "and ";
      this.match("AND_OPT");
      this.Expresion();
    }
    if (this.preAnalysis.type == "OR_OPT") {
      this.stringTraduccion += "or ";
      this.match("OR_OPT");
      this.Expresion();
    }
    if (this.preAnalysis.type == "XOR_OPT") {
      this.stringTraduccion += "xor ";
      this.match("XOR_OPT");
      this.Expresion();
    }
  }

  CondicionLogica() {
    if (this.preAnalysis.type == "GREATER_EQL") {
      if (this.forFound != true) {
        this.stringTraduccion += "< ";
      }
      this.match("GREATER_EQL");
      this.E();
    } else if (this.preAnalysis.type == "LESS_EQL") {
      if (this.forFound != true) {
        this.stringTraduccion += "< ";
      }
      this.match("LESS_EQL");
      this.E();
    } else if (this.preAnalysis.type == "LESS_THAN") {
      if (this.forFound != true) {
        this.stringTraduccion += "< ";
      }
      this.match("LESS_THAN");
      this.E();
    } else if (this.preAnalysis.type == "GREATER_THAN") {
      if (this.forFound != true) {
        this.stringTraduccion += "< ";
      }
      this.match("GREATER_THAN");
      this.E();
    } else if (this.preAnalysis.type == "INEQUALITY") {
      if (this.forFound != true) {
        this.stringTraduccion += "< ";
      }
      this.match("INEQUALITY");
      this.E();
    }
  }

  E() {
    this.T();
    this.EP();
  }

  EP() {
    if (this.preAnalysis.type == "PLUS_SIGN") {
      this.stringTraduccion += "+ ";
      this.match("PLUS_SIGN");
      this.T();
      this.EP();
    }
    if (this.preAnalysis.type == "SUBS_SIGN") {
      this.stringTraduccion += "- ";
      this.match("SUBS_SIGN");
      this.T();
      this.EP();
    }
  }

  T() {
    this.F();
    this.TP();
  }

  TP() {
    if (this.preAnalysis.type == "MULT_SIGN") {
      this.stringTraduccion += "* ";
      this.match("MULT_SIGN");
      this.F();
      this.TP();
    }
    if (this.preAnalysis.type == "DIV_SIGN") {
      this.stringTraduccion += "/";
      this.match("DIV_SIGN");
      this.F();
      this.TP();
    }
  }

  F() {
    if (this.preAnalysis.type == "NUMBER") {
      if (this.forFound != true) {
        this.stringTraduccion += this.preAnalysis.value + " ";
      } else if (this.forFound == true && this.forValue1 == "") {
        this.forValue1 = this.preAnalysis.value;
      } else if (
        this.forFound == true &&
        this.forValue2 == "" &&
        this.forValue1 != ""
      ) {
        this.forValue2 = this.preAnalysis.value;
      }
      this.match("NUMBER");
    } else if (this.preAnalysis.type == "ID") {
      if (this.forFound != true) {
        this.stringTraduccion += this.preAnalysis.value + " ";
      } else if (this.forFound == true && this.forValue1 == "") {
        this.forValue1 = this.preAnalysis.value;
      } else if (
        this.forFound == true &&
        this.forValue2 == "" &&
        this.forValue1 == ""
      ) {
        this.forValue2 = this.preAnalysis.value;
      }
      this.match("ID");
    } else if (this.preAnalysis.type == "DECIMAL") {
      this.match("DECIMAL");
    } else if (this.preAnalysis.type == "RESERVED_TRUE") {
      this.stringTraduccion += "True";
      this.match("RESERVED_TRUE");
    } else if (this.preAnalysis.type == "RESERVED_FALSE") {
      this.stringTraduccion += "False";
      this.match("RESERVED_FALSE");
    } else if (this.preAnalysis.type == "LEFT_PARENT") {
      this.match("LEFT_PARENT");
      this.E();
      this.match("RIGHT_PARENT");
    } else if (this.preAnalysis.type == "STRING") {
      this.stringTraduccion += this.preAnalysis.value;
      this.match("STRING");
    }
  }

  match(type) {
    if (this.preAnalysis.type != type) {
      if (this.errorFound == false) {
        let newError = new Error("Error encontrado, se esperaba " + type);
        this.errorList.push(newError);
        this.errorFound = true;
      }
    }

    if (
      (this.errorFound == true &&
        type == "SEMICOLON" &&
        this.preAnalysis.type == "SEMICOLON") ||
      (this.errorFound == true &&
        type == "RIGHT_BRACE" &&
        this.preAnalysis.type == "RIGHT_BRACE")
    ) {
      this.errorFound = false;
      console.log('Se empieza a analizar normal a partir de la fila', this.preAnalysis.row);
    }

    if (this.preAnalysis.type != "LAST") {
      if (this.errorFound == true) {
        if (
          this.preAnalysis.type != "SEMICOLON" &&
          this.preAnalysis.type != "RIGHT_BRACE" &&
          this.preAnalysis.type != "LAST"
        ) {
          this.numPreAnalysis++;
          this.preAnalysis = this.tokenList[this.numPreAnalysis];
        }
      } else {
        this.numPreAnalysis++;
        this.preAnalysis = this.tokenList[this.numPreAnalysis];
      }
    }
  }

  // Demás funciones
  tabular() {
    for (var i = 0; i < this.contTab; i++) {
      this.stringTraduccion += "\t";
    }
  }
}
module.exports = Parser;
