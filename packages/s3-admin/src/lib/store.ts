import create, {UseBoundStore} from "zustand"
import {GetState, SetState, State, StateCreator, StoreApi} from "zustand/vanilla";


// fix all typescript error and idk why
export const createStore = <TState extends State>(createState: StateCreator<TState, SetState<TState>, GetState<TState>, any> | StoreApi<TState>) =>
    create<TState>(createState) as UseBoundStore<TState, StoreApi<TState>>;
