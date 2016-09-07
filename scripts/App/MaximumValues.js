module.exports = (initialStr = 5, initialChar = 5 ) => {
  let BIGGEST_STRENGTH = initialStr
  let BIGGEST_CHARISMA = initialChar
  return Object.create({
    getValues(){
      return { STR: BIGGEST_STRENGTH, CHA: BIGGEST_CHARISMA}
    },
    setValues(STR, CHA){
      this.BIGGEST_STRENGTH = STR
      this.BIGGEST_CHARISMA = CHA
    }
  })
}
