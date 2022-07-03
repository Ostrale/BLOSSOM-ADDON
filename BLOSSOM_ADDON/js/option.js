function actualisation() {
    let parametres = [true, true, true, true]

    let option1 = document.getElementById("option1").checked
    parametres[0]=option1

    let option2 = document.getElementById("option2").checked
    parametres[1]=option2

    let option3 = document.getElementById("option3").checked
    parametres[2]=option3

    let option4 = document.getElementById("option4").checked
    parametres[3]=option4


    localStorage.setItem("Parametres", parametres)
    variable = localStorage.getItem('Parametres')
    variable = '['+variable+']'
    variable = JSON.parse(variable)
}

variable = localStorage.getItem('Parametres')
variable = '['+variable+']'
variable = JSON.parse(variable)
let option1 = document.getElementById("option1").checked = variable[0]
let option2 = document.getElementById("option2").checked = variable[1]
let option3 = document.getElementById("option3").checked = variable[2]
let option4 = document.getElementById("option4").checked = variable[3]



let submit = document.getElementById("submit")
submit.addEventListener("click", () => {actualisation()});

