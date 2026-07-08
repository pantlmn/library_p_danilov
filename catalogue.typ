#import "@preview/icu-datetime:0.2.2": fmt

#set page(
  paper: "a4",
  margin: (inside: 3cm, outside: 1.5cm, top: 2cm, bottom: 3cm),
  footer: context [#set text(size: 9pt)
    #counter(page).display("стр. 1 из 1", both: true) #h(1fr)
    #fmt(datetime.today(), locale: "ru", date-fields: "YMD", length: "long") 
  ]
)

#set text(font: "Literata", size: 10pt)

#let good_call_number  = regex("^[А-Я]+\-*[\d.]* [А-Я]\d{2} \d{5}$")



#let yaml_data = yaml("p_danilov.yaml")
#let yaml_data_with_call_numbers = yaml_data.map(id => {if "call-number" in id.keys() {id} else {id+=("call-number": "—")
id}})


#let yaml_sorted = yaml_data_with_call_numbers.pairs().sorted(key: it => it.at(1).at("call-number"))


#let good_items = yaml_sorted.filter(i => i.at(1).at("call-number").matches(good_call_number).len() > 0)
#let weak_items = yaml_sorted.filter(i => i.at(1).at("call-number").matches(good_call_number).len() == 0)

= Нормально описанные (#{good_items.len()} шт)


#for (k, data) in good_items {
  strong(data.at("call-number"))
  [*:* ]
  cite(label(k), form: "full")
  linebreak()
}

= Недостаточно описанные (#{weak_items.len()} шт)
#for (k, data) in weak_items {
  cite(label(k), form: "full")
  linebreak()
}


#set text(size: 0pt)
#bibliography("p_danilov.yaml", style: "gost-r-7-0-5-2008.csl", full: true)