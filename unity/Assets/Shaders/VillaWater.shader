Shader "AnotherWorld/VillaWater"
{
    Properties { _BaseColor("Pool tint",Color)=(0.015,0.19,0.32,1) }
    SubShader
    {
        Tags { "RenderPipeline"="UniversalPipeline" "RenderType"="Opaque" }
        Pass
        {
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            struct Attributes { float4 positionOS:POSITION; };
            struct Varyings { float4 positionCS:SV_POSITION; float3 world:TEXCOORD0; };
            CBUFFER_START(UnityPerMaterial)
            half4 _BaseColor;
            CBUFFER_END
            Varyings vert(Attributes input){Varyings o;o.world=TransformObjectToWorld(input.positionOS.xyz);o.positionCS=TransformWorldToHClip(o.world);return o;}
            half4 frag(Varyings input):SV_Target
            {
                float2 p=input.world.xz;
                float a=sin(p.x*7+p.y*3+_Time.y*.8),b=sin(p.y*10-p.x*2-_Time.y*1.1);
                float3 n=normalize(float3(a*.045,1,b*.045)),v=normalize(_WorldSpaceCameraPos-input.world);
                float fresnel=pow(1-saturate(dot(n,v)),4);
                float glint=pow(saturate(dot(reflect(-normalize(float3(.4,.8,-.3)),n),v)),100);
                float caustic=pow(saturate(1-abs(a*.5+b*.3+sin(p.x*3.1-p.y*1.7+_Time.y*.5)*.2)),18)*.035;
                return half4(lerp(_BaseColor.rgb,half3(.22,.52,.78),.18+fresnel*.6)+caustic*half3(.2,.6,.8)+glint*.75,1);
            }
            ENDHLSL
        }
    }
}
