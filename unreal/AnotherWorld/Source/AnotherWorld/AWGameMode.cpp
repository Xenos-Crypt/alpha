#include "AWGameMode.h"
#include "AWCharacter.h"
#include "AWAuroraVehicle.h"
#include "AWOrionTransit.h"
#include "EngineUtils.h"
#include "Engine/Canvas.h"
#include "Engine/Engine.h"

AAWGameMode::AAWGameMode()
{
    DefaultPawnClass = AAWCharacter::StaticClass();
    HUDClass = AAWHUD::StaticClass();
}

void AAWHUD::DrawHUD()
{
    Super::DrawHUD();
    if (!Canvas || !GEngine) return;
    DrawText(TEXT("HIDROK / ASHFORD"), FLinearColor(0.88f, 0.88f, 0.84f), 24, 24, GEngine->GetSmallFont(), 1.1f);
    for(TActorIterator<AAWOrionLine> Line(GetWorld());Line;++Line)
        if(Line->GetRider()&&Line->GetRider()==GetOwningPawn())
        {
            DrawRect(FLinearColor(.01f,.02f,.03f,.85f),18,44,1100,55);
            DrawText(Line->ServiceStatus(),FLinearColor(.6f,.9f,1),24,52,GEngine->GetSmallFont());
            DrawText(TEXT("Mouse look | E alight at Central when stopped and doors are open"),FLinearColor(.9f,.95f,1),24,76,GEngine->GetSmallFont());return;
        }
    if(auto* Vehicle=Cast<AAWAuroraVehicle>(GetOwningPawn()))
    {
        DrawText(Vehicle->Status(),FLinearColor(.65f,.9f,1.f),24,50,GEngine->GetSmallFont());
        if(Vehicle->DiagnosticsVisible())
        {
            DrawRect(FLinearColor(.01f,.02f,.03f,.88f),18,82,900,175);
            DrawText(Vehicle->Diagnostics(),FLinearColor(.85f,1.f,.85f),24,90,GEngine->GetSmallFont());
        }
        DrawText(TEXT("W/S throttle   A/D steer   Shift boost   F flight / land   Space up   Q down   L gear   C camera   E exit"),
            FLinearColor(.85f,.9f,.92f),24,Canvas->ClipY-42,GEngine->GetSmallFont());
        DrawText(TEXT("P parking pads   B boot   H service bonnet   O doors   K diagnostics (park first)"),FLinearColor(.85f,.9f,.92f),24,Canvas->ClipY-22,GEngine->GetSmallFont());
        return;
    }
    if(GetOwningPawn())
    {
        for(TActorIterator<AAWTransitLift> Lift(GetWorld());Lift;++Lift)
            if(FVector::Dist(GetOwningPawn()->GetActorLocation(),Lift->GetActorLocation())<450)
            {DrawText(TEXT("T / ORION station lift"),FLinearColor(.5f,.95f,1),24,Canvas->ClipY-65,GEngine->GetSmallFont());break;}
        for(TActorIterator<AAWOrionLine> Line(GetWorld());Line;++Line)
            if(FVector::Dist(GetOwningPawn()->GetActorLocation(),Line->BoardingPoint())<650)
            {
                DrawRect(FLinearColor(.01f,.02f,.03f,.85f),18,44,1100,55);
                DrawText(Line->ServiceStatus(),FLinearColor(.6f,.9f,1),24,52,GEngine->GetSmallFont());
                DrawText(Line->DoorsAreOpen()?TEXT("E / board Orion"):TEXT("Wait behind the platform edge for the next arrival"),FLinearColor(.9f,.95f,1),24,76,GEngine->GetSmallFont());break;
            }
    }
    DrawText(TEXT("WASD move   Mouse look   Shift sprint   Space jump   C crouch   F flashlight   E vehicle / train   T Orion lift"),
        FLinearColor(0.8f, 0.8f, 0.76f), 24, Canvas->ClipY - 42, GEngine->GetSmallFont(), 1.f);
}
