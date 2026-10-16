using UnityEngine;
namespace AnotherWorld.World
{
    public sealed class AnimalRoam : MonoBehaviour
    {
        Vector3 home,target;float timer;
        public float Radius=5,Speed=.8f;
        void Start(){home=target=transform.position;timer=Random.Range(0,4);}
        void Update()
        {
            if(Camera.main&&(Camera.main.transform.position-transform.position).sqrMagnitude>120*120)return;
            timer-=Time.deltaTime;if(timer<=0){var p=Random.insideUnitCircle*Radius;target=home+new Vector3(p.x,0,p.y);timer=Random.Range(4,9);}
            var d=target-transform.position;if(d.magnitude<.2f)return;
            if(Physics.SphereCast(transform.position+Vector3.up*.4f,.2f,d.normalized,out _,Speed*Time.deltaTime,~0,QueryTriggerInteraction.Ignore)){timer=0;return;}
            transform.position=Vector3.MoveTowards(transform.position,target,Speed*Time.deltaTime);
            transform.rotation=Quaternion.RotateTowards(transform.rotation,Quaternion.LookRotation(d),90*Time.deltaTime);
        }
        public static GameObject Create(Transform parent,Vector3 position,string species,int index)
        {
            var root=new GameObject(species).transform;root.SetParent(parent,false);root.position=position;
            bool penguin=species=="Penguin",deer=species=="Deer",wolf=species=="Wolf";
            var fur=WorldShapes.Material(species+" coat",penguin?new Color(.06f,.1f,.13f):deer?new Color(.52f,.33f,.16f):wolf?new Color(.3f,.29f,.27f):new Color(.62f,.57f,.46f));
            var cream=WorldShapes.Material("Animal ivory",new Color(.92f,.9f,.78f));
            SmoothShapes.Part(root,"Body",SmoothShapes.Ellipsoid,penguin?new Vector3(.55f,.9f,.5f):new Vector3(.65f,.7f,1.3f),new Vector3(0,penguin?.1f:.55f,0),fur);
            SmoothShapes.Part(root,"Head",SmoothShapes.Ellipsoid,new Vector3(.38f,.4f,.45f),new Vector3(0,penguin?.82f:1.15f,.5f),fur);
            if(penguin)SmoothShapes.Part(root,"White breast",SmoothShapes.Ellipsoid,new Vector3(.4f,.7f,.1f),new Vector3(0,.18f,.25f),cream);
            else foreach(int side in new[]{-1,1})foreach(int end in new[]{-1,1})SmoothShapes.Part(root,"Leg",SmoothShapes.Tube,new Vector3(.12f,.6f,.12f),new Vector3(side*.22f,0,end*.4f),fur);
            if(species=="Dog")
            {
                foreach(int side in new[]{-1,1})SmoothShapes.Part(root,"Floppy dog ear",SmoothShapes.Ellipsoid,new Vector3(.13f,.3f,.1f),new Vector3(side*.2f,1.15f,.5f),fur);
                var tail=WorldShapes.Box(root,"Dog tail",new Vector3(.09f,.08f,.65f),new Vector3(0,.95f,-.8f),fur,false,false);tail.transform.localRotation=Quaternion.Euler(-25,0,0);root.localScale=Vector3.one*.65f;
            }
            if(wolf)
            {
                foreach(int side in new[]{-1,1})SmoothShapes.Part(root,"Pointed wolf ear",SmoothShapes.Ellipsoid,new Vector3(.1f,.22f,.08f),new Vector3(side*.18f,1.42f,.52f),fur);
                var tail=WorldShapes.Box(root,"Wolf tail",new Vector3(.1f,.09f,.6f),new Vector3(0,.8f,-.85f),fur,false,false);tail.transform.localRotation=Quaternion.Euler(10,0,0);
            }
            foreach(int side in new[]{-1,1})
            {
                WorldShapes.Sphere(root,"Eye",new Vector3(.06f,.06f,.06f),new Vector3(side*.14f,penguin?1.02f:1.36f,.68f),WorldShapes.Material("Animal eyes",wolf?new Color(.9f,.75f,.1f):Color.black),false);
                if(deer)WorldShapes.Box(root,"Antler",new Vector3(.045f,.5f,.045f),new Vector3(side*.13f,1.65f,.5f),cream,false,false);
            }
            var body=root.gameObject.AddComponent<CapsuleCollider>();body.radius=.33f;body.height=1.3f;body.center=Vector3.up*.65f;
            var roam=root.gameObject.AddComponent<AnimalRoam>();roam.Radius=penguin?2.5f:4;roam.Speed=penguin?.45f:.8f;
            return root.gameObject;
        }
    }
}
