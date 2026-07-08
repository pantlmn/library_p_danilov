const archivePattern = /^[А-Я]{1,3}(-\d+)?(\.\d)?$/;
const callNumberPattern = /^[А-Я]\d{2}$/;

function checkArchiveLocation(item) {
    // Получаем значение поля "archiveLocation" (Место в архиве)
    const archiveLocation = item.getField('archiveLocation');
    
    if (!archiveLocation) return false;
    
    // Проверяем соответствие формату
    return archivePattern.test(archiveLocation.trim());
}


function checkCallNumber(item) {
    // Получаем значение поля "archiveLocation" (Место в архиве)
    const callNumber = item.getField('callNumber');
    
    if (!callNumber) return false;
    
    // Проверяем соответствие формату
    return callNumberPattern.test(callNumber.trim());
}


const results = [];


var selectedItems = ZoteroPane.getSelectedItems();
// selectedItems


for (const item of selectedItems) {
    if (checkArchiveLocation(item) && checkCallNumber(item)) {
        results.push(item);
    }
}

var r = results[0]

    var aL = r.getField("archiveLocation")
    var cN = r.getField("callNumber")

    r.setField("callNumber", aL+" "+cN)

    r.saveTx();
r