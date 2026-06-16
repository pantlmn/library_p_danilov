#import "@preview/icu-datetime:0.2.2": fmt

#set page(
  paper: "a4",
  margin: (inside: 3cm, outside: 1.5cm, top: 2cm, bottom: 3cm),
  footer: context [#set text(size: 9pt)
    #counter(page).display("стр. 1 из 1", both: true) #h(1fr)
    #fmt(datetime.today(), locale: "ru", date-fields: "YMD", length: "long") 
  ]
)

#let data = json("p_danilov.json")

// Helper function to extract author string from author array or literal
#let get-author(entry) = {
  if "author" in entry {
    let authors = entry.author
    if authors.len() > 0 {
      // Check for literal field first
      if "literal" in authors.at(0) {
        return authors.at(0).literal
      }
      // Handle array of authors with family/given
      let names = array.map(authors, (a) => {
        if "literal" in a {
          return a.literal
        } else if "family" in a {
          if "given" in a and a.given != "" {
            return a.family + " " + a.given.at(0) + "."
          } else {
            return a.family
          }
        } else {
          return "?"
        }
      })
      return names.join(", ")
    }
  } else if "editor" in entry {
    let editors = entry.editor
    if editors.len() > 0 {
      if "literal" in editors.at(0) {
        return editors.at(0).literal + " (ред.)"
      }
      let names = array.map(editors, (e) => {
        if "literal" in e {
          return e.literal
        } else if "family" in e {
          if "given" in e and e.given != "" {
            return e.family + " " + e.given
          } else {
            return e.family
          }
        } else {
          return "?"
        }
      })
      return names.join(", ") + " (ред.)"
    }
  }
  return ""
}

// Helper function to get call number
#let get-call-number(entry) = {
  if "call-number" in entry {
    return entry.call-number
  } else {
    return "—"
  }
}

// Helper function to get title
#let get-title(entry) = {
  if "title-short" in entry {
    return entry.title-short
  } else if "title" in entry {
    return entry.title
  } else {
    return "—"
  }
}

// Create array of entries with extracted fields
#let entries = array.map(data, (entry) => {
  (
    call-number: get-call-number(entry),
    author: get-author(entry),
    title: get-title(entry),
    original: entry
  )
})

// Sort entries - handle missing/null values
#let sorted = entries.sorted(key: a => a.call-number)

#set text(font: "Literata", size: 12pt)

// = Библиотечный каталог

// #let count = sorted.len()
// #text(weight: "regular", size: 9pt)[
//   *Всего записей:* #count
// ]

// #table(
//   columns: (auto, 2fr, 4fr),
//   stroke: (x, y) => {
//     if y == 0 {
//       (top: none, bottom: 1pt, right: none, left: none)
//     } else {
//       (top: none, bottom: none, right: none, left: none)
//     }
//   },
//   table.header(
//     repeat: true,
//     [*Call Number*],
//     [*Author / Editor*],
//     [*Title*],
//   ),
//   ..sorted.map(item => [
//     #item.call-number,
//     #item.author,
//     #item.title,
//   ])
// )

// Preview first few entries as a check
// #pagebreak()

// = Полный список 

// #for item in sorted {
//   [
//     #text(weight: "regular", size: 9pt)[
//       *#item.call-number* 
//       #emph(item.author)
//        #item.title \
//       \
//     ]
//   ]
// }

// #pagebreak()
#let good_call_number  = regex("^[А-Я]+\-*[\d.]* [А-Я]\d{2} \d{5}$")

= Нормально описанные

#for item in sorted.filter(i => i.call-number.matches(good_call_number).len() > 0) {
  [
    #text(weight: "regular", size: 9pt)[
      *#item.call-number* 
      #emph(item.author)
       #item.title \
      \
    ]
  ]
}


= Недостаточно описанные

#for item in sorted.filter(i => i.call-number.matches(good_call_number).len() == 0) {
  [
    #text(weight: "regular", size: 9pt)[
      *#item.call-number* 
      #emph(item.author)
       #item.title \
      \
    ]
  ]
}

