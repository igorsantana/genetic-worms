# Genetic Worms

The main idea behind this project is to create a population of Worms and improve them using some concepts of Genetic Algorithms.

## Abstract

We want to create a population of *n* worms that will improve over time. Our worms will have an name, gender, attributes and some specific skills.

### Attributes


  The attributes will have a critical matter on the interaction between the worms. Those attributes are:

  - `STRENGTH`: This will be the determinant attribute when two worms of the same gender find each other. The "winner" of the fight will be determinated by: `(worm1.strength + Math.random() * worm1.strength)` against `worm2.strength + Math.random() * worm2.strength`. The one with the highest value wins.

- `CHARISMA`: This will be the determinant attribute when two worms of different gender find each other.


These skills will determine what will happen when two worms find each other. The implemented skills will be, at v0.1:




 - **FIGHTER**:



```js
  const Worm = (name = '') => {
    const gender  = 'Male/Female'
    const name    = name
    const skills  = {}
  }

```
