#import "@preview/icu-datetime:0.2.2": fmt

#set page(
  paper: "a4",
  margin: (inside: 3cm, outside: 1.5cm, top: 2cm, bottom: 3cm),
  footer: context [#set text(size: 9pt)
    #counter(page).display("стр. 1 из 1", both: true) #h(1fr)
    #fmt(datetime.today(), locale: "ru", date-fields: "YMD", length: "long") 
  ]
)

#set text(font: "Literata", size: 10pt, lang: "ru")

#let good_call_number  = regex("^([А-Я]{1,3})\-*(\d*)\.*(\d)* ([А-Я]\d{2}) (\d{5})$")

#let parse_call_number(x) = {
  let xx = x.match(good_call_number)
  if xx == none {return (x, )}
  xx = xx.captures
  let k1 = if xx.at(1)=="" {0} else {int(xx.at(1))}
  let k2 = if xx.at(2) == none {0} else {int(xx.at(2))}
  return (xx.at(0), k1, k2, xx.at(3), int(xx.at(4)))
}


#let call_numbers_compare(a, b) = {
  let aa = parse_call_number(a)
  if aa.len() != 5 {return false}
  let bb = parse_call_number(b)
  if bb.len() != 5 {return false}
  for i in range(5) {
    if aa.at(i) > bb.at(i) {return false}
    if aa.at(i) < bb.at(i) {return true}
  }
  return true
}


#let yaml_data = yaml("p_danilov.yaml")
#let yaml_data_with_call_numbers = yaml_data.map(id => {if "call-number" in id.keys() {id} else {id+=("call-number": "—")
id}})

#let good_items_unsorted = yaml_data_with_call_numbers.pairs().filter(i => i.at(1).at("call-number").matches(good_call_number).len() > 0)

#let weak_items_unsorted = yaml_data_with_call_numbers.pairs().filter(i => i.at(1).at("call-number").matches(good_call_number).len() == 0)

#let good_items_sorted = good_items_unsorted.sorted(key: it => it.at(1).at("call-number"), by: call_numbers_compare)

#let weak_items_sorted = weak_items_unsorted.sorted(key: it => it.at(1).at("call-number"))


#let used_numbers = good_items_sorted.map(it => parse_call_number(it.at(1).call-number).at(4))

#let unused_numbers = range(1, 347).filter(it => not used_numbers.contains(it) )
Не появившиеся номера (#unused_numbers.len() шт.): #unused_numbers.map(it => str(it)).join(", ")

#let sections = json("sections.json")
#outline()
= Нормально описанные (#{good_items_sorted.len()} шт)

#let prev_section = ""
#for (k, data) in good_items_sorted {
  let this_section = data.at("call-number").split(" ").at(0)
  if this_section != prev_section {
    [== #this_section: #sections.at(this_section)]
    prev_section = this_section
  }
  strong(data.at("call-number"))
  [*:* ]
  cite(label(k), form: "full")
  linebreak()
}

// = Недостаточно описанные (#{weak_items_sorted.len()} шт)
// #for (k, data) in weak_items_sorted {
//   strong(data.at("call-number"))
//   [*:* ]  
//   cite(label(k), form: "full")
//   linebreak()
// }


#set text(size: 0pt)
#bibliography("p_danilov.yaml", style: "gost-r-7-0-5-2008.csl", full: true)