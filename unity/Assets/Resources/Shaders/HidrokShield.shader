Shader "AnotherWorld/HidrokShield"
{
    SubShader
    {
        Tags { "RenderPipeline"="UniversalPipeline" "Queue"="Transparent" "RenderType"="Transparent" }
        Pass
        {
            Name "Shield"
            Tags { "LightMode"="SRPDefaultUnlit" }
            Blend SrcAlpha OneMinusSrcAlpha
            ZWrite Off
            Cull Off
            HLSLPROGRAM
            #pragma target 3.5
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            struct Attributes { float4 positionOS:POSITION;float2 uv:TEXCOORD0; };
            struct Varyings { float4 positionCS:SV_POSITION;float3 positionOS:TEXCOORD0; };
            Varyings vert(Attributes input){Varyings output;output.positionCS=TransformObjectToHClip(input.positionOS.xyz);output.positionOS=input.positionOS.xyz;return output;}
            half4 frag(Varyings input):SV_Target
            {
                // Two staggered lattices form continuous hexagons. Planar
                // projection avoids the old longitude seams and polar pinch.
                float2 p=input.positionOS.xz/72.0;
                float2 spacing=float2(1,1.7320508);
                float2 a=p-spacing*round(p/spacing);
                float2 b=p-spacing*(round(p/spacing-.5)+.5);
                float2 h=dot(a,a)<dot(b,b)?a:b;
                h=abs(h);
                float edge=abs(max(dot(h,float2(.5,.8660254)),h.x)-.5);
                float aa=max(fwidth(edge),.001);
                float core=1-smoothstep(.009,.009+aa,edge);
                float halo=exp(-edge*edge/0.0014);
                float radial=length(input.positionOS.xz);
                float ring=exp(-pow((radial-1050)/6,2))*.15;
                float height=saturate(input.positionOS.y/480);
                float visibility=smoothstep(.25,.7,height)*.65*(1-.65*smoothstep(.86,1,height));
                float alpha=(core*.65+halo*.23)*visibility+ring;
                return half4(.25,.94,1,alpha);
            }
            ENDHLSL
        }
    }
}
