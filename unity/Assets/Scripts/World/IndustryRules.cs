using System;
namespace AnotherWorld.World
{
    public enum IndustrialResource { Materials,Energy,Components,Hovercraft,Airframes,Saucers }
    [Serializable] public sealed class IndustryLedger
    {
        public int[] Stock={40,60,8,0,0,0};
        public int this[IndustrialResource resource]=>Stock[(int)resource];
        public bool Spend(IndustrialResource resource,int amount)
        {if(amount<0||this[resource]<amount)return false;Stock[(int)resource]-=amount;return true;}
        public void Add(IndustrialResource resource,int amount){Stock[(int)resource]=Math.Min(10000,this[resource]+Math.Max(0,amount));}
    }
    [Serializable] public sealed class ProductionOrder
    {
        public IndustrialResource Input,Output;public int InputAmount,EnergyCost,OutputAmount=1;public float Duration=20,Elapsed;public bool Running;
        public bool Start(IndustryLedger ledger)
        {
            if(Running||ledger[Input]<InputAmount+(Input==IndustrialResource.Energy?EnergyCost:0)||ledger[IndustrialResource.Energy]<EnergyCost)return false;
            ledger.Spend(Input,InputAmount);ledger.Spend(IndustrialResource.Energy,EnergyCost);Elapsed=0;Running=true;return true;
        }
        public bool Advance(float seconds,IndustryLedger ledger)
        {
            if(!Running||seconds<=0)return false;
            Elapsed=Math.Min(Duration,Elapsed+seconds);if(Elapsed<Duration)return false;
            Running=false;ledger.Add(Output,OutputAmount);return true;
        }
    }
}
