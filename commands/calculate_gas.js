export default function calculate_gas(interaction){
    let gaslimit = interaction.options.getInteger('gas_limit');
    let gwei = interaction.options.getInteger('gwei');
    let priorityFee = interaction.options.getInteger('priority_fee');

    let cost = gaslimit * (gwei + priorityFee) / 1000000000;
    let finalCost = (gwei + " gwei " + priorityFee + " priority fee: " + "**" + cost + "**").toString();

    interaction.reply({ content: `${finalCost}`, ephemeral: true });
};