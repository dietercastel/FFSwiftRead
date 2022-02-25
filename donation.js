$(function(){
    //set donation listeners
    recurrenceChanged();
    $('select#donation-recurrence').change(recurrenceChanged);
});

function recurrenceChanged () {
    selected = $('select#donation-recurrence').val();
    if (selected === "M") {
        //show monthly stuff
        $('#donation-type').val("_xclick-subscriptions");
        $('#monthly-donation-amount-row').show("fast");
    }
    else if (selected === "O") {
        //show daily stuff
        $('#donation-type').val("_donations");  
        //hide monthly donation amount
        $('#monthly-donation-amount-row').hide("fast");
    }
}